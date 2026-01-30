/**
 * Basic Usage Example
 * 
 * This example shows how to use the tool programmatically
 * instead of using the interactive CLI.
 */

import { GoogleMapsScraper } from '../src/scrapers/googleMapsScraper';
import { WhatsAppClient } from '../src/messaging/whatsappClient';
import { MessageGenerator } from '../src/messaging/messageTemplates';
import { logger } from '../src/utils/logger';

async function basicExample() {
  try {
    // Step 1: Initialize and scrape Google Maps
    logger.info('Starting Google Maps scraper...');
    const scraper = new GoogleMapsScraper();
    await scraper.initialize();

    // Search for businesses
    const businesses = await scraper.searchBusinesses('coffee shops in Seattle', 10);
    logger.info(`Found ${businesses.length} businesses`);

    // Export data
    await scraper.exportToCSV(businesses, 'seattle_coffee_shops.csv');
    await scraper.exportToJSON(businesses, 'seattle_coffee_shops.json');
    await scraper.close();

    // Step 2: Filter businesses with WhatsApp
    const businessesWithWhatsApp = businesses.filter((b) => b.whatsappNumber);
    logger.info(`${businessesWithWhatsApp.length} businesses have WhatsApp`);

    if (businessesWithWhatsApp.length === 0) {
      logger.warn('No businesses with WhatsApp found. Exiting.');
      return;
    }

    // Step 3: Initialize WhatsApp client
    logger.info('Initializing WhatsApp client...');
    const whatsappClient = new WhatsAppClient();
    await whatsappClient.initialize();

    // Step 4: Send messages
    const results = await whatsappClient.sendBulkMessages(
      businessesWithWhatsApp,
      'general_intro', // Template ID
      'John Doe', // Your name
      'Digital Marketing Pro' // Your company
    );

    // Step 5: Display results
    const successCount = results.filter((r) => r.success).length;
    logger.info(`Campaign completed: ${successCount}/${results.length} messages sent`);

    // Close WhatsApp client
    await whatsappClient.close();

  } catch (error) {
    logger.error('Error in basic example:', error);
    throw error;
  }
}

// Run the example
basicExample().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
