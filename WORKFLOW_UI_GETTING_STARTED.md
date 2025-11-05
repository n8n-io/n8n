# Getting Started: Next-Gen Workflow UI

This guide will help you set up and start developing the next-generation workflow UI.

---

## Prerequisites

- Node.js 20+ (LTS)
- pnpm 9+
- Git
- Modern browser with WebGL 2.0 support

---

## Quick Start

### 1. Initialize Project

```bash
# Create project directory
mkdir workflow-ui-nextgen
cd workflow-ui-nextgen

# Initialize pnpm workspace
pnpm init

# Create workspace structure
mkdir -p apps/web packages plugins workers

# Initialize git
git init
git add .
git commit -m "Initial commit"
```

### 2. Set Up Monorepo Configuration

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'plugins/*'
```

Create `package.json`:

```json
{
  "name": "workflow-ui-nextgen",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0",
    "@types/node": "^20.0.0"
  }
}
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

### 3. Create Core Packages

#### Workflow Engine Package

```bash
cd packages
mkdir workflow-engine
cd workflow-engine
pnpm init
```

Create `packages/workflow-engine/package.json`:

```json
{
  "name": "@workflow-ui/workflow-engine",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "immer": "^10.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.7.0"
  }
}
```

Create `packages/workflow-engine/tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false
});
```

Create `packages/workflow-engine/src/index.ts`:

```typescript
// Core types
export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  parameters: Record<string, any>;
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourceOutput: number;
  targetNodeId: string;
  targetInput: number;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings: WorkflowSettings;
}

export interface WorkflowSettings {
  executionOrder: 'v0' | 'v1';
  saveDataErrorExecution: boolean;
  saveDataSuccessExecution: boolean;
  saveManualExecutions: boolean;
}

// Graph utilities
export class WorkflowGraph {
  constructor(private workflow: Workflow) {}

  /**
   * Get all downstream nodes from a given node
   */
  getDownstreamNodes(nodeId: string): WorkflowNode[] {
    const visited = new Set<string>();
    const queue = [nodeId];
    const result: WorkflowNode[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = this.workflow.nodes.find(n => n.id === currentId);
      if (node && currentId !== nodeId) {
        result.push(node);
      }

      const connections = this.workflow.connections.filter(
        c => c.sourceNodeId === currentId
      );
      queue.push(...connections.map(c => c.targetNodeId));
    }

    return result;
  }

  /**
   * Get all upstream nodes from a given node
   */
  getUpstreamNodes(nodeId: string): WorkflowNode[] {
    const visited = new Set<string>();
    const queue = [nodeId];
    const result: WorkflowNode[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = this.workflow.nodes.find(n => n.id === currentId);
      if (node && currentId !== nodeId) {
        result.push(node);
      }

      const connections = this.workflow.connections.filter(
        c => c.targetNodeId === currentId
      );
      queue.push(...connections.map(c => c.sourceNodeId));
    }

    return result;
  }

  /**
   * Detect cycles in the workflow
   */
  hasCycle(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const connections = this.workflow.connections.filter(
        c => c.sourceNodeId === nodeId
      );

      for (const conn of connections) {
        if (!visited.has(conn.targetNodeId)) {
          if (dfs(conn.targetNodeId)) return true;
        } else if (recursionStack.has(conn.targetNodeId)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of this.workflow.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  /**
   * Get topological sort of nodes
   */
  getExecutionOrder(): WorkflowNode[] {
    const inDegree = new Map<string, number>();
    const result: WorkflowNode[] = [];

    // Calculate in-degree for each node
    for (const node of this.workflow.nodes) {
      inDegree.set(node.id, 0);
    }

    for (const conn of this.workflow.connections) {
      inDegree.set(conn.targetNodeId, (inDegree.get(conn.targetNodeId) || 0) + 1);
    }

    // Queue nodes with in-degree 0
    const queue = this.workflow.nodes.filter(n => inDegree.get(n.id) === 0);

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const connections = this.workflow.connections.filter(
        c => c.sourceNodeId === node.id
      );

      for (const conn of connections) {
        const newInDegree = (inDegree.get(conn.targetNodeId) || 0) - 1;
        inDegree.set(conn.targetNodeId, newInDegree);

        if (newInDegree === 0) {
          const targetNode = this.workflow.nodes.find(
            n => n.id === conn.targetNodeId
          );
          if (targetNode) queue.push(targetNode);
        }
      }
    }

    return result;
  }
}

// Validation
export interface ValidationError {
  nodeId: string;
  parameter?: string;
  message: string;
}

export class WorkflowValidator {
  constructor(private workflow: Workflow) {}

  validate(): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for cycles
    const graph = new WorkflowGraph(this.workflow);
    if (graph.hasCycle()) {
      errors.push({
        nodeId: '',
        message: 'Workflow contains a cycle'
      });
    }

    // Check for disconnected nodes
    for (const node of this.workflow.nodes) {
      const hasInput = this.workflow.connections.some(
        c => c.targetNodeId === node.id
      );
      const hasOutput = this.workflow.connections.some(
        c => c.sourceNodeId === node.id
      );

      if (!hasInput && !hasOutput) {
        errors.push({
          nodeId: node.id,
          message: 'Node is not connected'
        });
      }
    }

    return errors;
  }
}

// Export all
export * from './types';
```

#### Canvas Renderer Package

```bash
cd packages
mkdir canvas-renderer
cd canvas-renderer
pnpm init
```

Create `packages/canvas-renderer/package.json`:

```json
{
  "name": "@workflow-ui/canvas-renderer",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "pixi.js": "^8.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.7.0"
  }
}
```

Create `packages/canvas-renderer/src/index.ts`:

```typescript
import * as PIXI from 'pixi.js';
import type { WorkflowNode, WorkflowConnection } from '@workflow-ui/workflow-engine';

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface CanvasRendererOptions {
  backgroundColor?: number;
  antialias?: boolean;
}

/**
 * High-performance canvas renderer using Pixi.js
 */
export class CanvasRenderer {
  private app: PIXI.Application;
  private viewport: Viewport;
  private nodeContainer: PIXI.Container;
  private connectionContainer: PIXI.Container;
  private nodeSprites = new Map<string, PIXI.Graphics>();

  constructor(
    private canvas: HTMLCanvasElement,
    options: CanvasRendererOptions = {}
  ) {
    this.app = new PIXI.Application();

    this.app.init({
      canvas,
      backgroundColor: options.backgroundColor ?? 0xf5f5f5,
      antialias: options.antialias ?? true,
      resolution: window.devicePixelRatio,
      autoDensity: true
    }).then(() => {
      // Create containers for layers
      this.connectionContainer = new PIXI.Container();
      this.nodeContainer = new PIXI.Container();

      this.app.stage.addChild(this.connectionContainer);
      this.app.stage.addChild(this.nodeContainer);

      // Initialize viewport
      this.viewport = {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
        zoom: 1
      };
    });
  }

  /**
   * Render nodes and connections
   */
  render(nodes: WorkflowNode[], connections: WorkflowConnection[]): void {
    // Clear previous frame
    this.nodeContainer.removeChildren();
    this.connectionContainer.removeChildren();
    this.nodeSprites.clear();

    // Render connections first (below nodes)
    this.renderConnections(connections, nodes);

    // Render nodes
    this.renderNodes(nodes);
  }

  /**
   * Render workflow nodes
   */
  private renderNodes(nodes: WorkflowNode[]): void {
    for (const node of nodes) {
      const sprite = this.createNodeSprite(node);
      this.nodeSprites.set(node.id, sprite);
      this.nodeContainer.addChild(sprite);
    }
  }

  /**
   * Create sprite for a single node
   */
  private createNodeSprite(node: WorkflowNode): PIXI.Graphics {
    const graphics = new PIXI.Graphics();

    // Node dimensions
    const width = 200;
    const height = 80;

    // Draw node rectangle
    graphics.beginFill(0xffffff);
    graphics.lineStyle(2, 0x555555);
    graphics.drawRoundedRect(
      node.position.x,
      node.position.y,
      width,
      height,
      8
    );
    graphics.endFill();

    // Add node name text
    const text = new PIXI.Text(node.name, {
      fontSize: 14,
      fill: 0x333333
    });
    text.x = node.position.x + 10;
    text.y = node.position.y + 10;
    graphics.addChild(text);

    // Make interactive
    graphics.eventMode = 'static';
    graphics.cursor = 'pointer';

    return graphics;
  }

  /**
   * Render connections between nodes
   */
  private renderConnections(
    connections: WorkflowConnection[],
    nodes: WorkflowNode[]
  ): void {
    for (const conn of connections) {
      const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
      const targetNode = nodes.find(n => n.id === conn.targetNodeId);

      if (!sourceNode || !targetNode) continue;

      const graphics = new PIXI.Graphics();

      // Calculate connection points
      const sourceX = sourceNode.position.x + 200; // Right edge
      const sourceY = sourceNode.position.y + 40;  // Center
      const targetX = targetNode.position.x;       // Left edge
      const targetY = targetNode.position.y + 40;  // Center

      // Draw bezier curve
      graphics.lineStyle(2, 0x999999);
      graphics.moveTo(sourceX, sourceY);

      const controlPoint1X = sourceX + (targetX - sourceX) / 2;
      const controlPoint2X = targetX - (targetX - sourceX) / 2;

      graphics.bezierCurveTo(
        controlPoint1X,
        sourceY,
        controlPoint2X,
        targetY,
        targetX,
        targetY
      );

      this.connectionContainer.addChild(graphics);
    }
  }

  /**
   * Update viewport (pan/zoom)
   */
  setViewport(viewport: Partial<Viewport>): void {
    this.viewport = { ...this.viewport, ...viewport };

    // Update stage transformation
    this.app.stage.position.set(-this.viewport.x, -this.viewport.y);
    this.app.stage.scale.set(this.viewport.zoom);
  }

  /**
   * Hit test - find node at position
   */
  hitTest(x: number, y: number): string | null {
    // Convert screen to world coordinates
    const worldX = x / this.viewport.zoom + this.viewport.x;
    const worldY = y / this.viewport.zoom + this.viewport.y;

    for (const [nodeId, sprite] of this.nodeSprites) {
      if (sprite.containsPoint({ x: worldX, y: worldY })) {
        return nodeId;
      }
    }

    return null;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.app.destroy(true);
  }
}
```

#### Plugin SDK Package

```bash
cd packages
mkdir plugin-sdk
cd plugin-sdk
pnpm init
```

Create `packages/plugin-sdk/src/index.ts`:

```typescript
import type { WorkflowNode } from '@workflow-ui/workflow-engine';

/**
 * Plugin definition
 */
export interface WorkflowPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;

  dependencies?: Record<string, string>;

  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onError?: (error: Error) => void;

  nodes?: NodePluginDefinition[];
  panels?: PanelPluginDefinition[];
  commands?: CommandPluginDefinition[];
}

/**
 * Node plugin definition
 */
export interface NodePluginDefinition {
  type: string;
  displayName: string;
  description: string;
  icon: string;
  category: string;

  inputs: NodeIODefinition[];
  outputs: NodeIODefinition[];

  parameters: ParameterDefinition[];

  render?: (node: WorkflowNode, context: NodeRenderContext) => any;
  configure: (node: WorkflowNode, context: NodeConfigContext) => any;
  execute: (input: NodeExecutionInput, context: NodeExecutionContext) => Promise<NodeExecutionOutput>;
  validate?: (node: WorkflowNode) => ValidationError[];
}

export interface NodeIODefinition {
  name: string;
  type: 'main' | 'ai' | 'trigger';
  displayName?: string;
  required?: boolean;
  multiple?: boolean;
}

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'select' | 'credential';
  displayName: string;
  description?: string;
  default?: any;
  required?: boolean;
  options?: Array<{ value: any; label: string }>;
  displayOptions?: {
    show?: Record<string, any[]>;
    hide?: Record<string, any[]>;
  };
}

export interface NodeRenderContext {
  zoom: number;
  selected: boolean;
  hovered: boolean;
}

export interface NodeConfigContext {
  workflow: any;
  updateNode: (updates: Partial<WorkflowNode>) => void;
}

export interface NodeExecutionInput {
  parameters: Record<string, any>;
  inputData?: any[];
}

export interface NodeExecutionContext {
  workflowId: string;
  executionId: string;
}

export interface NodeExecutionOutput {
  json?: any;
  binary?: any;
  [key: string]: any;
}

export interface ValidationError {
  parameter?: string;
  message: string;
}

/**
 * Panel plugin definition
 */
export interface PanelPluginDefinition {
  id: string;
  title: string;
  icon: string;
  position: 'left' | 'right' | 'bottom';
  defaultSize: number;
  render: (context: PanelContext) => any;
  shortcut?: string;
  showInMenu?: boolean;
}

export interface PanelContext {
  workflowId: string | null;
  selectedNodes: WorkflowNode[];
  executionId: string | null;
  close: () => void;
  resize: (size: number) => void;
}

/**
 * Command plugin definition
 */
export interface CommandPluginDefinition {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: string;
  keywords: string[];
  shortcut?: string;
  isVisible?: (context: CommandContext) => boolean;
  execute: (context: CommandContext) => void | Promise<void>;
}

export interface CommandContext {
  view: 'canvas' | 'settings' | 'execution';
  selectedNodes: string[];
  workflowId?: string;
  permissions: string[];
}

/**
 * Helper function to define plugin
 */
export function definePlugin(plugin: WorkflowPlugin): WorkflowPlugin {
  return plugin;
}

/**
 * Plugin registry
 */
export class PluginRegistry {
  private plugins = new Map<string, WorkflowPlugin>();
  private loadedPlugins = new Set<string>();

  register(plugin: WorkflowPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} already registered`);
    }

    this.plugins.set(plugin.id, plugin);
  }

  async load(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (this.loadedPlugins.has(pluginId)) {
      return;
    }

    await plugin.onLoad?.();
    this.loadedPlugins.add(pluginId);
  }

  async unload(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    await plugin.onUnload?.();
    this.loadedPlugins.delete(pluginId);
  }

  getPlugin(pluginId: string): WorkflowPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): WorkflowPlugin[] {
    return Array.from(this.plugins.values());
  }
}
```

### 4. Create Main Web App

```bash
cd apps
pnpm create vite web --template react-ts
cd web
pnpm install
```

Update `apps/web/package.json`:

```json
{
  "name": "@workflow-ui/web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@workflow-ui/workflow-engine": "workspace:*",
    "@workflow-ui/canvas-renderer": "workspace:*",
    "@workflow-ui/plugin-sdk": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^5.0.0",
    "immer": "^10.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

Create `apps/web/src/stores/workflow.store.ts`:

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { WorkflowNode, WorkflowConnection, Workflow } from '@workflow-ui/workflow-engine';

interface WorkflowStore {
  // State
  currentWorkflowId: string | null;
  nodes: Map<string, WorkflowNode>;
  connections: Map<string, WorkflowConnection>;

  // Actions
  setCurrentWorkflow: (workflow: Workflow) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void;
  deleteNode: (id: string) => void;
  addConnection: (connection: WorkflowConnection) => void;
  deleteConnection: (id: string) => void;
}

export const useWorkflowStore = create<WorkflowStore>()(
  immer((set) => ({
    currentWorkflowId: null,
    nodes: new Map(),
    connections: new Map(),

    setCurrentWorkflow: (workflow) => set((state) => {
      state.currentWorkflowId = workflow.id;
      state.nodes = new Map(workflow.nodes.map(n => [n.id, n]));
      state.connections = new Map(workflow.connections.map(c => [c.id, c]));
    }),

    addNode: (node) => set((state) => {
      state.nodes.set(node.id, node);
    }),

    updateNode: (id, updates) => set((state) => {
      const node = state.nodes.get(id);
      if (node) {
        state.nodes.set(id, { ...node, ...updates });
      }
    }),

    deleteNode: (id) => set((state) => {
      state.nodes.delete(id);

      // Delete connected connections
      for (const [connId, conn] of state.connections) {
        if (conn.sourceNodeId === id || conn.targetNodeId === id) {
          state.connections.delete(connId);
        }
      }
    }),

    addConnection: (connection) => set((state) => {
      state.connections.set(connection.id, connection);
    }),

    deleteConnection: (id) => set((state) => {
      state.connections.delete(id);
    })
  }))
);
```

Create `apps/web/src/components/Canvas.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { CanvasRenderer } from '@workflow-ui/canvas-renderer';
import { useWorkflowStore } from '../stores/workflow.store';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer>();

  const nodes = useWorkflowStore(state => Array.from(state.nodes.values()));
  const connections = useWorkflowStore(state => Array.from(state.connections.values()));

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new CanvasRenderer(canvasRef.current);
    rendererRef.current = renderer;

    return () => renderer.dispose();
  }, []);

  // Render when data changes
  useEffect(() => {
    if (!rendererRef.current) return;

    rendererRef.current.render(nodes, connections);
  }, [nodes, connections]);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      style={{ display: 'block' }}
    />
  );
}
```

Create `apps/web/src/App.tsx`:

```typescript
import { Canvas } from './components/Canvas';
import { useWorkflowStore } from './stores/workflow.store';
import { useEffect } from 'react';

function App() {
  const setCurrentWorkflow = useWorkflowStore(state => state.setCurrentWorkflow);

  // Load demo workflow
  useEffect(() => {
    setCurrentWorkflow({
      id: 'demo',
      name: 'Demo Workflow',
      nodes: [
        {
          id: 'node1',
          type: 'trigger',
          name: 'Webhook',
          position: { x: 100, y: 100 },
          parameters: {}
        },
        {
          id: 'node2',
          type: 'http',
          name: 'HTTP Request',
          position: { x: 400, y: 100 },
          parameters: {}
        }
      ],
      connections: [
        {
          id: 'conn1',
          sourceNodeId: 'node1',
          sourceOutput: 0,
          targetNodeId: 'node2',
          targetInput: 0
        }
      ],
      settings: {
        executionOrder: 'v1',
        saveDataErrorExecution: true,
        saveDataSuccessExecution: true,
        saveManualExecutions: true
      }
    });
  }, [setCurrentWorkflow]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Canvas />
    </div>
  );
}

export default App;
```

### 5. Install Dependencies

```bash
# From project root
pnpm install

# Build all packages
pnpm build
```

### 6. Run Development Server

```bash
# Start dev server
pnpm dev
```

Open browser to `http://localhost:5173` and you should see a simple workflow with two nodes connected!

---

## Project Structure

Your project should now look like this:

```
workflow-ui-nextgen/
├── apps/
│   └── web/                    # Main web application
│       ├── src/
│       │   ├── components/
│       │   │   └── Canvas.tsx
│       │   ├── stores/
│       │   │   └── workflow.store.ts
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── package.json
│
├── packages/
│   ├── workflow-engine/        # Core workflow logic
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── canvas-renderer/        # Pixi.js renderer
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── plugin-sdk/             # Plugin development kit
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
├── plugins/                    # Built-in plugins (add later)
├── workers/                    # Web Workers (add later)
├── pnpm-workspace.yaml
├── package.json
└── turbo.json
```

---

## Next Steps

### Phase 1: Enhance Canvas Rendering
1. Add pan/zoom controls
2. Implement node selection
3. Add connection creation via drag-and-drop
4. Implement viewport culling for performance

### Phase 2: Build Node Detail View
1. Create NDV component
2. Add parameter configuration
3. Implement data preview
4. Add inline editing mode

### Phase 3: Create First Plugin
1. Build HTTP Request node plugin
2. Add node execution logic
3. Create node configuration UI
4. Test plugin system

### Phase 4: Add State Persistence
1. Implement IndexedDB storage
2. Add workflow save/load
3. Create execution data storage
4. Add caching layer

### Phase 5: Advanced Features
1. Command palette
2. Keyboard shortcuts
3. Undo/redo
4. Multi-canvas support
5. AI assistant integration

---

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- No `any` types allowed
- Prefer functional components (React)
- Use Zustand for state management
- Follow ESLint rules

### Testing
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run type checking
pnpm typecheck
```

### Building
```bash
# Build all packages
pnpm build

# Build specific package
cd packages/workflow-engine
pnpm build
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add my feature"

# Push to remote
git push origin feature/my-feature

# Create pull request
```

---

## Resources

- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Pixi.js Documentation](https://pixijs.com/guides)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## Support

For questions or issues:
1. Check documentation
2. Search existing issues
3. Create new issue with reproduction
4. Join Discord community

---

*Happy coding! 🚀*
