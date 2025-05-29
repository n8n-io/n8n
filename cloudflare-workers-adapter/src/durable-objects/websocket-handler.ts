/**
 * WebSocket Handler Durable Object
 * 
 * Handles real-time communication for the n8n frontend
 */

import { DurableObject } from 'cloudflare:workers';

interface ConnectedClient {
  websocket: WebSocket;
  userId: string;
  sessionId: string;
  connectedAt: number;
}

export class WebSocketHandler extends DurableObject {
  private clients: Map<string, ConnectedClient> = new Map();
  private sessions: Map<string, Set<string>> = new Map(); // userId -> Set of sessionIds

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/ws') {
      return this.handleWebSocketUpgrade(request);
    }
    
    if (url.pathname === '/broadcast') {
      return this.handleBroadcast(request);
    }
    
    if (url.pathname === '/stats') {
      return this.handleStats(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Handle WebSocket upgrade
   */
  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    server.accept();

    // Generate session ID
    const sessionId = crypto.randomUUID();
    
    // Handle WebSocket events
    server.addEventListener('message', (event) => {
      this.handleWebSocketMessage(sessionId, event.data);
    });

    server.addEventListener('close', () => {
      this.handleWebSocketClose(sessionId);
    });

    server.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
      this.handleWebSocketClose(sessionId);
    });

    // Store client info (will be updated when authenticated)
    this.clients.set(sessionId, {
      websocket: server,
      userId: '', // Will be set after authentication
      sessionId,
      connectedAt: Date.now(),
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(sessionId: string, data: any): void {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(sessionId);
      
      if (!client) {
        return;
      }

      switch (message.type) {
        case 'authenticate':
          this.handleAuthentication(sessionId, message.data);
          break;
          
        case 'subscribe':
          this.handleSubscription(sessionId, message.data);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscription(sessionId, message.data);
          break;
          
        case 'ping':
          this.sendToClient(sessionId, { type: 'pong', timestamp: Date.now() });
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendToClient(sessionId, { 
        type: 'error', 
        message: 'Invalid message format' 
      });
    }
  }

  /**
   * Handle client authentication
   */
  private handleAuthentication(sessionId: string, authData: any): void {
    const client = this.clients.get(sessionId);
    if (!client) return;

    // In a real implementation, you would verify the JWT token here
    const { token, userId } = authData;
    
    // For demo purposes, we'll accept any userId
    if (userId) {
      client.userId = userId;
      
      // Add to user sessions
      if (!this.sessions.has(userId)) {
        this.sessions.set(userId, new Set());
      }
      this.sessions.get(userId)!.add(sessionId);
      
      this.sendToClient(sessionId, {
        type: 'authenticated',
        userId,
        sessionId,
      });
      
      console.log(`User ${userId} authenticated with session ${sessionId}`);
    } else {
      this.sendToClient(sessionId, {
        type: 'authentication_failed',
        message: 'Invalid credentials',
      });
    }
  }

  /**
   * Handle subscription to events
   */
  private handleSubscription(sessionId: string, subscriptionData: any): void {
    const client = this.clients.get(sessionId);
    if (!client || !client.userId) {
      this.sendToClient(sessionId, {
        type: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Store subscription preferences (in a real implementation)
    this.sendToClient(sessionId, {
      type: 'subscribed',
      subscription: subscriptionData,
    });
  }

  /**
   * Handle unsubscription from events
   */
  private handleUnsubscription(sessionId: string, subscriptionData: any): void {
    this.sendToClient(sessionId, {
      type: 'unsubscribed',
      subscription: subscriptionData,
    });
  }

  /**
   * Handle WebSocket close
   */
  private handleWebSocketClose(sessionId: string): void {
    const client = this.clients.get(sessionId);
    if (client) {
      // Remove from user sessions
      if (client.userId && this.sessions.has(client.userId)) {
        this.sessions.get(client.userId)!.delete(sessionId);
        if (this.sessions.get(client.userId)!.size === 0) {
          this.sessions.delete(client.userId);
        }
      }
      
      // Remove client
      this.clients.delete(sessionId);
      
      console.log(`Client ${sessionId} disconnected`);
    }
  }

  /**
   * Handle broadcast requests from other parts of the application
   */
  private async handleBroadcast(request: Request): Promise<Response> {
    try {
      const { type, data, userId, workflowId } = await request.json();
      
      let targetSessions: string[] = [];
      
      if (userId) {
        // Broadcast to specific user
        const userSessions = this.sessions.get(userId);
        if (userSessions) {
          targetSessions = Array.from(userSessions);
        }
      } else {
        // Broadcast to all connected clients
        targetSessions = Array.from(this.clients.keys());
      }
      
      const message = {
        type,
        data,
        timestamp: Date.now(),
        ...(workflowId && { workflowId }),
      };
      
      let sentCount = 0;
      for (const sessionId of targetSessions) {
        if (this.sendToClient(sessionId, message)) {
          sentCount++;
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        sentTo: sentCount,
        totalClients: this.clients.size,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      
    } catch (error) {
      console.error('Broadcast error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Handle stats request
   */
  private async handleStats(request: Request): Promise<Response> {
    const stats = {
      totalClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.userId).length,
      totalUsers: this.sessions.size,
      uptime: Date.now() - Math.min(...Array.from(this.clients.values()).map(c => c.connectedAt)),
      clientsByUser: Object.fromEntries(
        Array.from(this.sessions.entries()).map(([userId, sessions]) => [
          userId,
          sessions.size,
        ])
      ),
    };
    
    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(sessionId: string, message: any): boolean {
    const client = this.clients.get(sessionId);
    if (!client) {
      return false;
    }
    
    try {
      client.websocket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Error sending to client ${sessionId}:`, error);
      // Remove broken connection
      this.handleWebSocketClose(sessionId);
      return false;
    }
  }

  /**
   * Broadcast execution status updates
   */
  async broadcastExecutionUpdate(executionId: string, status: string, data?: any): Promise<void> {
    const message = {
      type: 'execution_update',
      executionId,
      status,
      data,
      timestamp: Date.now(),
    };
    
    // Broadcast to all authenticated clients
    for (const [sessionId, client] of this.clients.entries()) {
      if (client.userId) {
        this.sendToClient(sessionId, message);
      }
    }
  }

  /**
   * Broadcast workflow status updates
   */
  async broadcastWorkflowUpdate(workflowId: string, event: string, data?: any): Promise<void> {
    const message = {
      type: 'workflow_update',
      workflowId,
      event,
      data,
      timestamp: Date.now(),
    };
    
    // Broadcast to all authenticated clients
    for (const [sessionId, client] of this.clients.entries()) {
      if (client.userId) {
        this.sendToClient(sessionId, message);
      }
    }
  }
}