/**
 * Custom Template Example
 * 
 * This example shows how to create and use custom message templates
 */

import { WhatsAppClient } from '../src/messaging/whatsappClient';
import { BusinessData } from '../src/scrapers/googleMapsScraper';
import { logger } from '../src/utils/logger';

// Custom template function
function createCustomMessage(business: BusinessData): string {
  const location = business.address.split(',')[1]?.trim() || 'your area';
  
  return `🎉 Hey ${business.name}!

I was just browsing Google Maps and stumbled upon your business. That ${business.rating} ⭐ rating is impressive!

Quick question: Are you currently using any automation tools to handle customer inquiries?

I'm working with a few businesses in ${location} to set up automated WhatsApp responses that save them 10+ hours per week.

Would you be interested in a free demo? No commitment, just showing you what's possible.

Let me know! 🚀

- Alex
Digital Automation Expert`;
}

// Another custom template with emojis and urgency
function createLimitedOfferMessage(business: BusinessData): string {
  return `⚡ SPECIAL OFFER for ${business.name}! ⚡

Hi! I'm reaching out to just 10 businesses in your area this week.

We're offering a FREE marketing audit (worth $500) to help local businesses like yours get more customers online.

Your ${business.rating} rating shows you're doing great work - imagine what you could do with 2x the visibility! 📈

Interested? Just reply "YES" and I'll send you the details.

Only 3 spots left this week! ⏰

Cheers,
Sarah | Local Business Growth`;
}

// Seasonal template
function createSeasonalMessage(business: BusinessData): string {
  const season = new Date().getMonth() < 6 ? 'summer' : 'holiday';
  
  return `🌟 Hi ${business.name}!

With ${season} season approaching, I wanted to reach out about something that could help you prepare.

I noticed your excellent ${business.rating} rating on Google Maps - you clearly know how to keep customers happy! 😊

Are you planning any special promotions for the busy ${season} period?

I help businesses like yours create automated marketing campaigns that bring in 30-50% more customers during peak seasons.

Would you like to chat about it? I have some ideas specific to your business type.

Best regards,
Mike | Seasonal Marketing Specialist`;
}

async function customTemplateExample() {
  try {
    // Sample business data (in real use, this would come from scraper)
    const sampleBusinesses: BusinessData[] = [
      {
        name: "Joe's Coffee Shop",
        address: "123 Main St, Seattle, WA",
        phone: "+12065551234",
        whatsappNumber: "12065551234",
        website: "https://joescoffee.com",
        rating: "4.8",
        reviewCount: "150",
        category: "Coffee Shop",
        placeId: "abc123",
      },
      {
        name: "Bella's Italian Restaurant",
        address: "456 Oak Ave, Seattle, WA",
        phone: "+12065555678",
        whatsappNumber: "12065555678",
        website: "https://bellas.com",
        rating: "4.6",
        reviewCount: "230",
        category: "Italian Restaurant",
        placeId: "def456",
      },
    ];

    // Initialize WhatsApp
    const whatsappClient = new WhatsAppClient();
    await whatsappClient.initialize();

    // Send custom messages
    for (const business of sampleBusinesses) {
      // Choose template based on business type or other criteria
      let message: string;
      
      if (business.category.toLowerCase().includes('restaurant')) {
        message = createSeasonalMessage(business);
      } else if (business.rating && parseFloat(business.rating) >= 4.5) {
        message = createCustomMessage(business);
      } else {
        message = createLimitedOfferMessage(business);
      }

      logger.info(`Sending custom message to ${business.name}`);
      logger.info(`Message preview:\n${message}\n`);

      // Send the message
      const result = await whatsappClient.sendMessage(
        business.whatsappNumber,
        message
      );

      if (result.success) {
        logger.info(`✅ Message sent successfully to ${business.name}`);
      } else {
        logger.error(`❌ Failed to send to ${business.name}: ${result.error}`);
      }

      // Wait between messages
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    await whatsappClient.close();
    logger.info('Custom template campaign completed!');

  } catch (error) {
    logger.error('Error in custom template example:', error);
    throw error;
  }
}

// Run the example
customTemplateExample().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
