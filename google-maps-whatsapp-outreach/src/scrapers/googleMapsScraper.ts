import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { config, delay } from '../utils/config';
import fs from 'fs';
import path from 'path';

export interface BusinessData {
  name: string;
  address: string;
  phone: string;
  whatsappNumber: string;
  website: string;
  rating: string;
  reviewCount: string;
  category: string;
  placeId: string;
}

export class GoogleMapsScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    logger.info('Initializing Google Maps scraper...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    logger.info('Browser initialized successfully');
  }

  async searchBusinesses(query: string, maxResults: number = 20): Promise<BusinessData[]> {
    if (!this.page) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    logger.info(`Searching for: "${query}"`);
    const businesses: BusinessData[] = [];

    try {
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      await delay(3000);

      // Wait for results to load
      await this.page.waitForSelector('div[role="feed"]', { timeout: 10000 });
      logger.info('Search results loaded');

      // Scroll to load more results
      await this.scrollResults(maxResults);

      // Get all business links
      const businessLinks = await this.page.evaluate(() => {
        const links: string[] = [];
        const elements = document.querySelectorAll('a[href*="/maps/place/"]');
        elements.forEach((el) => {
          const href = el.getAttribute('href');
          if (href && !links.includes(href)) {
            links.push(href);
          }
        });
        return links;
      });

      logger.info(`Found ${businessLinks.length} businesses`);

      // Extract data from each business
      for (let i = 0; i < Math.min(businessLinks.length, maxResults); i++) {
        try {
          logger.info(`Scraping business ${i + 1}/${Math.min(businessLinks.length, maxResults)}`);
          const businessData = await this.extractBusinessData(businessLinks[i]);
          if (businessData) {
            businesses.push(businessData);
          }
          await delay(config.rateLimiting.scrapeDelay);
        } catch (error) {
          logger.error(`Error scraping business ${i + 1}:`, error);
        }
      }

      logger.info(`Successfully scraped ${businesses.length} businesses`);
      return businesses;
    } catch (error) {
      logger.error('Error during scraping:', error);
      throw error;
    }
  }

  private async scrollResults(targetCount: number): Promise<void> {
    if (!this.page) return;

    logger.info('Scrolling to load more results...');
    
    for (let i = 0; i < 5; i++) {
      await this.page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
        }
      });
      await delay(2000);
    }
  }

  private async extractBusinessData(url: string): Promise<BusinessData | null> {
    if (!this.page) return null;

    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(2000);

      const data = await this.page.evaluate(() => {
        const getText = (selector: string): string => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || '';
        };

        const getAttribute = (selector: string, attr: string): string => {
          const element = document.querySelector(selector);
          return element?.getAttribute(attr) || '';
        };

        // Extract business name
        const name = getText('h1.DUwDvf') || getText('h1');

        // Extract address
        const address = getText('button[data-item-id="address"]') || 
                       getText('button[data-tooltip*="address"]');

        // Extract phone number
        const phone = getText('button[data-item-id*="phone"]') ||
                     getText('button[data-tooltip*="phone"]');

        // Extract website
        const website = getAttribute('a[data-item-id="authority"]', 'href') ||
                       getAttribute('a[data-tooltip*="website"]', 'href');

        // Extract rating
        const rating = getText('div.F7nice span[aria-hidden="true"]');

        // Extract review count
        const reviewCount = getText('div.F7nice span[aria-label*="reviews"]');

        // Extract category
        const category = getText('button.DkEaL');

        return {
          name,
          address,
          phone,
          website,
          rating,
          reviewCount,
          category,
        };
      });

      // Extract WhatsApp number from phone or website
      const whatsappNumber = this.extractWhatsAppNumber(data.phone, data.website);

      // Extract place ID from URL
      const placeIdMatch = url.match(/!1s([^!]+)/);
      const placeId = placeIdMatch ? placeIdMatch[1] : '';

      return {
        ...data,
        whatsappNumber,
        placeId,
      };
    } catch (error) {
      logger.error('Error extracting business data:', error);
      return null;
    }
  }

  private extractWhatsAppNumber(phone: string, website: string): string {
    // Clean phone number and check if it's a valid format
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If phone exists and looks valid, assume it might be WhatsApp
    if (cleanPhone.length >= 10) {
      return cleanPhone;
    }

    // Check website for WhatsApp links
    if (website.includes('wa.me') || website.includes('whatsapp')) {
      const match = website.match(/\d{10,15}/);
      if (match) {
        return match[0];
      }
    }

    return '';
  }

  async exportToCSV(businesses: BusinessData[], filename: string): Promise<void> {
    const outputDir = config.output.dir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, filename);
    const csvHeader = 'Name,Address,Phone,WhatsApp Number,Website,Rating,Review Count,Category,Place ID\n';
    
    const csvRows = businesses.map((b) => {
      return [
        `"${b.name.replace(/"/g, '""')}"`,
        `"${b.address.replace(/"/g, '""')}"`,
        `"${b.phone}"`,
        `"${b.whatsappNumber}"`,
        `"${b.website}"`,
        `"${b.rating}"`,
        `"${b.reviewCount}"`,
        `"${b.category}"`,
        `"${b.placeId}"`,
      ].join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');
    fs.writeFileSync(filePath, csvContent, 'utf-8');
    logger.info(`Data exported to ${filePath}`);
  }

  async exportToJSON(businesses: BusinessData[], filename: string): Promise<void> {
    const outputDir = config.output.dir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(businesses, null, 2), 'utf-8');
    logger.info(`Data exported to ${filePath}`);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }
}
