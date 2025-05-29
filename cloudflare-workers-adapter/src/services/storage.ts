/**
 * Storage Service - R2 Adapter
 * 
 * This service provides file storage functionality using Cloudflare R2,
 * replacing the original filesystem-based storage.
 */

export class StorageService {
  constructor(private r2: R2Bucket) {}

  /**
   * Store a file in R2 bucket
   */
  async storeFile(key: string, data: ArrayBuffer | Uint8Array | string, metadata?: Record<string, string>) {
    const options: R2PutOptions = {};
    
    if (metadata) {
      options.customMetadata = metadata;
    }

    // Set content type based on file extension
    const extension = key.split('.').pop()?.toLowerCase();
    if (extension) {
      options.httpMetadata = {
        contentType: this.getContentType(extension),
      };
    }

    await this.r2.put(key, data, options);
    return key;
  }

  /**
   * Retrieve a file from R2 bucket
   */
  async getFile(key: string): Promise<R2ObjectBody | null> {
    return await this.r2.get(key);
  }

  /**
   * Get file as ArrayBuffer
   */
  async getFileBuffer(key: string): Promise<ArrayBuffer | null> {
    const object = await this.r2.get(key);
    if (!object) return null;
    return await object.arrayBuffer();
  }

  /**
   * Get file as text
   */
  async getFileText(key: string): Promise<string | null> {
    const object = await this.r2.get(key);
    if (!object) return null;
    return await object.text();
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<R2Object | null> {
    return await this.r2.head(key);
  }

  /**
   * Delete a file from R2 bucket
   */
  async deleteFile(key: string): Promise<void> {
    await this.r2.delete(key);
  }

  /**
   * List files with optional prefix
   */
  async listFiles(prefix?: string, limit = 1000): Promise<R2Objects> {
    const options: R2ListOptions = { limit };
    if (prefix) {
      options.prefix = prefix;
    }
    return await this.r2.list(options);
  }

  /**
   * Store workflow execution data
   */
  async storeExecutionData(executionId: string, data: any): Promise<string> {
    const key = `executions/${executionId}/data.json`;
    await this.storeFile(key, JSON.stringify(data), {
      executionId,
      type: 'execution-data',
      timestamp: new Date().toISOString(),
    });
    return key;
  }

  /**
   * Retrieve workflow execution data
   */
  async getExecutionData(executionId: string): Promise<any | null> {
    const key = `executions/${executionId}/data.json`;
    const text = await this.getFileText(key);
    return text ? JSON.parse(text) : null;
  }

  /**
   * Store binary data (files uploaded during workflow execution)
   */
  async storeBinaryData(executionId: string, nodeId: string, fileName: string, data: ArrayBuffer, mimeType?: string): Promise<string> {
    const key = `executions/${executionId}/binary/${nodeId}/${fileName}`;
    const metadata = {
      executionId,
      nodeId,
      fileName,
      type: 'binary-data',
      timestamp: new Date().toISOString(),
    };

    if (mimeType) {
      metadata.mimeType = mimeType;
    }

    await this.storeFile(key, data, metadata);
    return key;
  }

  /**
   * Get binary data
   */
  async getBinaryData(key: string): Promise<ArrayBuffer | null> {
    return await this.getFileBuffer(key);
  }

  /**
   * Store workflow backup
   */
  async storeWorkflowBackup(workflowId: string, workflowData: any): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `backups/workflows/${workflowId}/${timestamp}.json`;
    
    await this.storeFile(key, JSON.stringify(workflowData), {
      workflowId,
      type: 'workflow-backup',
      timestamp,
    });
    
    return key;
  }

  /**
   * Store user uploaded files
   */
  async storeUserFile(userId: string, fileName: string, data: ArrayBuffer, mimeType?: string): Promise<string> {
    const sanitizedFileName = this.sanitizeFileName(fileName);
    const key = `users/${userId}/files/${Date.now()}-${sanitizedFileName}`;
    
    const metadata = {
      userId,
      originalFileName: fileName,
      type: 'user-file',
      timestamp: new Date().toISOString(),
    };

    if (mimeType) {
      metadata.mimeType = mimeType;
    }

    await this.storeFile(key, data, metadata);
    return key;
  }

  /**
   * Generate a signed URL for temporary access
   */
  async generateSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    // Note: R2 doesn't have built-in signed URLs like S3
    // This would need to be implemented using Cloudflare's API
    // For now, return a placeholder
    return `https://your-r2-domain.com/${key}?expires=${Date.now() + expiresIn * 1000}`;
  }

  /**
   * Clean up old execution data
   */
  async cleanupOldExecutions(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const objects = await this.listFiles('executions/');
    let deletedCount = 0;

    for (const object of objects.objects) {
      if (object.uploaded < cutoffDate) {
        await this.deleteFile(object.key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalObjects: number;
    totalSize: number;
    executionData: number;
    binaryData: number;
    backups: number;
    userFiles: number;
  }> {
    const allObjects = await this.listFiles();
    
    const stats = {
      totalObjects: allObjects.objects.length,
      totalSize: 0,
      executionData: 0,
      binaryData: 0,
      backups: 0,
      userFiles: 0,
    };

    for (const object of allObjects.objects) {
      stats.totalSize += object.size;
      
      if (object.key.startsWith('executions/') && object.key.endsWith('/data.json')) {
        stats.executionData++;
      } else if (object.key.includes('/binary/')) {
        stats.binaryData++;
      } else if (object.key.startsWith('backups/')) {
        stats.backups++;
      } else if (object.key.startsWith('users/') && object.key.includes('/files/')) {
        stats.userFiles++;
      }
    }

    return stats;
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      'json': 'application/json',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'csv': 'text/csv',
      'xml': 'application/xml',
    };

    return contentTypes[extension] || 'application/octet-stream';
  }

  /**
   * Sanitize file name for safe storage
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
}