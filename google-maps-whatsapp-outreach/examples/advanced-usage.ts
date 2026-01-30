/**
 * Advanced Usage Example
 * 
 * This example demonstrates advanced features:
 * - Custom message templates
 * - Filtering and segmentation
 * - A/B testing
 * - Custom rate limiting
 */

import { GoogleMapsScraper, BusinessData } from '../src/scrapers/googleMapsScraper';
import { WhatsAppClient } from '../src/messaging/whatsappClient';
import { MessageGenerator } from '../src/messaging/messageTemplates';
import { logger } from '../src/utils/logger';
import { delay } from '../src/utils/config';

async function advancedExample() {
  try {
    // Step 1: Scrape multiple categories
    const scraper = new GoogleMapsScraper();
    await scraper.initialize();

    const categories = [
      'restaurants in Boston',
      'cafes in Boston',
      'bars in Boston',
    ];

    let allBusinesses: BusinessData[] = [];

    for (const category of categories) {
      logger.info(`Scraping: ${category}`);
      const businesses = await scraper.searchBusinesses(category, 15);
      allBusinesses = [...allBusinesses, ...businesses];
      await delay(5000); // Wait between categories
    }

    await scraper.close();
    logger.info(`Total businesses scraped: ${allBusinesses.length}`);

    // Step 2: Advanced filtering
    const filteredBusinesses = allBusinesses.filter((business) => {
      // Only businesses with WhatsApp
      if (!business.whatsappNumber) return false;

      // Only businesses with good ratings (4.0+)
      const rating = parseFloat(business.rating);
      if (isNaN(rating) || rating < 4.0) return false;

      // Only businesses with reviews (engaged customers)
      const reviewCount = parseInt(business.reviewCount);
      if (isNaN(reviewCount) || reviewCount < 10) return false;

      return true;
    });

    logger.info(`Filtered to ${filteredBusinesses.length} high-quality businesses`);

    // Step 3: Segment by category
    const restaurants = filteredBusinesses.filter((b) =>
      b.category.toLowerCase().includes('restaurant')
    );
    const cafes = filteredBusinesses.filter((b) =>
      b.category.toLowerCase().includes('cafe') ||
      b.category.toLowerCase().includes('coffee')
    );
    const bars = filteredBusinesses.filter((b) =>
      b.category.toLowerCase().includes('bar')
    );

    logger.info(`Segments: ${restaurants.length} restaurants, ${cafes.length} cafes, ${bars.length} bars`);

    // Step 4: A/B Testing - Send different templates to different segments
    const whatsappClient = new WhatsAppClient();
    await whatsappClient.initialize();

    // Send restaurant-specific template to restaurants
    logger.info('Sending to restaurants with restaurant template...');
    const restaurantResults = await whatsappClient.sendBulkMessages(
      restaurants.slice(0, 5), // Test with 5 first
      'restaurant_special',
      'John Doe',
      'FoodTech Solutions'
    );

    // Send value-first template to cafes
    logger.info('Sending to cafes with value-first template...');
    const cafeResults = await whatsappClient.sendBulkMessages(
      cafes.slice(0, 5),
      'value_proposition',
      'John Doe',
      'FoodTech Solutions'
    );

    // Send social proof template to bars
    logger.info('Sending to bars with social proof template...');
    const barResults = await whatsappClient.sendBulkMessages(
      bars.slice(0, 5),
      'social_proof',
      'John Doe',
      'FoodTech Solutions'
    );

    // Step 5: Analyze results
    const analyzeResults = (results: any[], segment: string) => {
      const total = results.length;
      const successful = results.filter((r) => r.success).length;
      const failed = total - successful;
      const successRate = ((successful / total) * 100).toFixed(2);

      logger.info(`${segment} Results:`);
      logger.info(`  Total: ${total}`);
      logger.info(`  Successful: ${successful}`);
      logger.info(`  Failed: ${failed}`);
      logger.info(`  Success Rate: ${successRate}%`);
    };

    analyzeResults(restaurantResults, 'Restaurants');
    analyzeResults(cafeResults, 'Cafes');
    analyzeResults(barResults, 'Bars');

    await whatsappClient.close();

    logger.info('Advanced campaign completed!');

  } catch (error) {
    logger.error('Error in advanced example:', error);
    throw error;
  }
}

// Run the example
advancedExample().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
