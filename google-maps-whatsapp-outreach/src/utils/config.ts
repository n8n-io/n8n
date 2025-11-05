import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface Config {
  googleMaps: {
    searchQuery: string;
    maxResults: number;
  };
  whatsapp: {
    sessionPath: string;
  };
  rateLimiting: {
    scrapeDelay: number;
    messageDelay: number;
  };
  message: {
    senderName: string;
    senderCompany: string;
  };
  output: {
    dir: string;
    format: 'csv' | 'json';
  };
}

export const config: Config = {
  googleMaps: {
    searchQuery: process.env.GOOGLE_MAPS_SEARCH_QUERY || 'restaurants in New York',
    maxResults: parseInt(process.env.GOOGLE_MAPS_MAX_RESULTS || '20', 10),
  },
  whatsapp: {
    sessionPath: process.env.WHATSAPP_SESSION_PATH || './whatsapp-session',
  },
  rateLimiting: {
    scrapeDelay: parseInt(process.env.SCRAPE_DELAY || '2000', 10),
    messageDelay: parseInt(process.env.MESSAGE_DELAY || '5000', 10),
  },
  message: {
    senderName: process.env.SENDER_NAME || 'Your Name',
    senderCompany: process.env.SENDER_COMPANY || 'Your Company',
  },
  output: {
    dir: process.env.OUTPUT_DIR || './output',
    format: (process.env.EXPORT_FORMAT as 'csv' | 'json') || 'csv',
  },
};

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
