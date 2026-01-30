import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { logger } from '../utils/logger';
import { config, delay } from '../utils/config';
import { BusinessData } from '../scrapers/googleMapsScraper';
import { MessageGenerator } from './messageTemplates';

export interface MessageResult {
  business: BusinessData;
  success: boolean;
  error?: string;
  messageId?: string;
  timestamp: Date;
}

export class WhatsAppClient {
  private client: Client | null = null;
  private isReady: boolean = false;

  async initialize(): Promise<void> {
    logger.info('Initializing WhatsApp client...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: config.whatsapp.sessionPath,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      },
    });

    this.client.on('qr', (qr) => {
      logger.info('QR Code received. Please scan with your WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      logger.info('WhatsApp client is ready!');
      this.isReady = true;
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp authenticated successfully');
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      logger.warn('WhatsApp client disconnected:', reason);
      this.isReady = false;
    });

    await this.client.initialize();

    // Wait for client to be ready
    await this.waitForReady();
  }

  private async waitForReady(timeout: number = 60000): Promise<void> {
    const startTime = Date.now();
    while (!this.isReady) {
      if (Date.now() - startTime > timeout) {
        throw new Error('WhatsApp client initialization timeout');
      }
      await delay(1000);
    }
  }

  async sendMessage(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client not initialized or not ready');
    }

    try {
      // Format phone number (remove non-digits and add country code if needed)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      if (!formattedNumber) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      // Check if number is registered on WhatsApp
      const numberId = await this.client.getNumberId(formattedNumber);
      
      if (!numberId) {
        logger.warn(`Number ${formattedNumber} is not registered on WhatsApp`);
        return {
          success: false,
          error: 'Number not registered on WhatsApp',
        };
      }

      // Send message
      const chat = await this.client.sendMessage(numberId._serialized, message);
      
      logger.info(`Message sent successfully to ${formattedNumber}`);
      return {
        success: true,
        messageId: chat.id._serialized,
      };
    } catch (error: any) {
      logger.error(`Error sending message to ${phoneNumber}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  async sendBulkMessages(
    businesses: BusinessData[],
    templateId?: string,
    senderName?: string,
    senderCompany?: string
  ): Promise<MessageResult[]> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client not initialized or not ready');
    }

    const results: MessageResult[] = [];
    const sender = senderName || config.message.senderName;
    const company = senderCompany || config.message.senderCompany;

    logger.info(`Starting bulk message campaign to ${businesses.length} businesses`);

    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      
      try {
        // Skip if no WhatsApp number
        if (!business.whatsappNumber) {
          logger.warn(`Skipping ${business.name} - no WhatsApp number`);
          results.push({
            business,
            success: false,
            error: 'No WhatsApp number available',
            timestamp: new Date(),
          });
          continue;
        }

        // Generate personalized message
        const selectedTemplateId = templateId || MessageGenerator.selectTemplateForBusiness(business);
        const message = MessageGenerator.generateMessage(
          business,
          selectedTemplateId,
          sender,
          company
        );

        logger.info(`Sending message to ${business.name} (${i + 1}/${businesses.length})`);
        
        // Send message
        const result = await this.sendMessage(business.whatsappNumber, message);
        
        results.push({
          business,
          success: result.success,
          error: result.error,
          messageId: result.messageId,
          timestamp: new Date(),
        });

        // Rate limiting delay
        if (i < businesses.length - 1) {
          logger.info(`Waiting ${config.rateLimiting.messageDelay}ms before next message...`);
          await delay(config.rateLimiting.messageDelay);
        }
      } catch (error: any) {
        logger.error(`Error processing ${business.name}:`, error);
        results.push({
          business,
          success: false,
          error: error.message || 'Unknown error',
          timestamp: new Date(),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info(`Campaign completed: ${successCount}/${businesses.length} messages sent successfully`);

    return results;
  }

  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If number is too short, return null
    if (cleaned.length < 10) {
      return null;
    }

    // If number doesn't start with country code, assume US (+1)
    // You can modify this logic based on your target region
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned; // Add US country code
    }

    return cleaned;
  }

  async getClientInfo(): Promise<any> {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp client not initialized or not ready');
    }

    const info = await this.client.info;
    return info;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      logger.info('WhatsApp client closed');
    }
  }

  isClientReady(): boolean {
    return this.isReady;
  }
}
