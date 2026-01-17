import { GoogleMapsScraper, BusinessData } from './scrapers/googleMapsScraper';
import { WhatsAppClient, MessageResult } from './messaging/whatsappClient';
import { MessageGenerator } from './messaging/messageTemplates';
import { logger } from './utils/logger';
import { config } from './utils/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Google Maps to WhatsApp Outreach Tool                   ║');
  console.log('║   Automated Business Outreach System                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Choose operation mode
    console.log('Select operation mode:');
    console.log('1. Scrape Google Maps only');
    console.log('2. Send WhatsApp messages only (from existing data)');
    console.log('3. Full automation (Scrape + Send messages)');
    console.log('4. View message templates\n');

    const mode = await question('Enter your choice (1-4): ');

    if (mode === '4') {
      displayTemplates();
      rl.close();
      return;
    }

    let businesses: BusinessData[] = [];

    // Step 2: Scrape or load data
    if (mode === '1' || mode === '3') {
      const searchQuery = await question(
        `Enter search query (default: "${config.googleMaps.searchQuery}"): `
      );
      const maxResults = await question(
        `Enter max results (default: ${config.googleMaps.maxResults}): `
      );

      const query = searchQuery || config.googleMaps.searchQuery;
      const max = parseInt(maxResults) || config.googleMaps.maxResults;

      logger.info('Starting Google Maps scraper...');
      const scraper = new GoogleMapsScraper();
      await scraper.initialize();

      businesses = await scraper.searchBusinesses(query, max);

      // Export scraped data
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `businesses_${timestamp}`;
      
      await scraper.exportToCSV(businesses, `${filename}.csv`);
      await scraper.exportToJSON(businesses, `${filename}.json`);
      
      await scraper.close();

      logger.info(`Scraped ${businesses.length} businesses`);
      
      if (mode === '1') {
        console.log('\n✅ Scraping completed! Data saved to output folder.');
        rl.close();
        return;
      }
    }

    // Step 3: Load existing data if mode is 2
    if (mode === '2') {
      const files = fs.readdirSync(config.output.dir).filter((f) => f.endsWith('.json'));
      
      if (files.length === 0) {
        console.log('❌ No data files found in output folder. Please scrape first.');
        rl.close();
        return;
      }

      console.log('\nAvailable data files:');
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
      });

      const fileChoice = await question('\nSelect file number: ');
      const selectedFile = files[parseInt(fileChoice) - 1];

      if (!selectedFile) {
        console.log('❌ Invalid file selection.');
        rl.close();
        return;
      }

      const filePath = path.join(config.output.dir, selectedFile);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      businesses = JSON.parse(fileContent);

      logger.info(`Loaded ${businesses.length} businesses from ${selectedFile}`);
    }

    // Step 4: Filter businesses with WhatsApp numbers
    const businessesWithWhatsApp = businesses.filter((b) => b.whatsappNumber);
    
    console.log(`\n📊 Statistics:`);
    console.log(`   Total businesses: ${businesses.length}`);
    console.log(`   With WhatsApp: ${businessesWithWhatsApp.length}`);
    console.log(`   Without WhatsApp: ${businesses.length - businessesWithWhatsApp.length}\n`);

    if (businessesWithWhatsApp.length === 0) {
      console.log('❌ No businesses with WhatsApp numbers found.');
      rl.close();
      return;
    }

    // Step 5: Configure messaging
    console.log('Available message templates:');
    const templates = MessageGenerator.getAllTemplates();
    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name} (${template.category.join(', ')})`);
    });
    console.log(`${templates.length + 1}. Auto-select based on business category\n`);

    const templateChoice = await question('Select template (or auto-select): ');
    const templateIndex = parseInt(templateChoice) - 1;
    const selectedTemplateId = templateIndex < templates.length 
      ? templates[templateIndex].id 
      : undefined;

    const senderName = await question(
      `Enter your name (default: "${config.message.senderName}"): `
    );
    const senderCompany = await question(
      `Enter your company (default: "${config.message.senderCompany}"): `
    );

    const sender = senderName || config.message.senderName;
    const company = senderCompany || config.message.senderCompany;

    // Step 6: Preview message
    console.log('\n📝 Message Preview:');
    console.log('─────────────────────────────────────────────────────────');
    const previewBusiness = businessesWithWhatsApp[0];
    const previewTemplateId = selectedTemplateId || MessageGenerator.selectTemplateForBusiness(previewBusiness);
    const previewMessage = MessageGenerator.generateMessage(
      previewBusiness,
      previewTemplateId,
      sender,
      company
    );
    console.log(previewMessage);
    console.log('─────────────────────────────────────────────────────────\n');

    const confirm = await question('Proceed with sending messages? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Operation cancelled.');
      rl.close();
      return;
    }

    // Step 7: Initialize WhatsApp and send messages
    logger.info('Initializing WhatsApp client...');
    const whatsappClient = new WhatsAppClient();
    await whatsappClient.initialize();

    console.log('\n📤 Sending messages...\n');
    const results = await whatsappClient.sendBulkMessages(
      businessesWithWhatsApp,
      selectedTemplateId,
      sender,
      company
    );

    // Step 8: Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFilename = `campaign_results_${timestamp}.json`;
    const resultsPath = path.join(config.output.dir, resultsFilename);
    
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');

    // Step 9: Display summary
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Campaign Summary                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📊 Success Rate: ${((successCount / results.length) * 100).toFixed(2)}%`);
    console.log(`📁 Results saved to: ${resultsFilename}\n`);

    // Display failed messages
    if (failureCount > 0) {
      console.log('Failed messages:');
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.business.name}: ${r.error}`);
        });
    }

    await whatsappClient.close();
    rl.close();

    logger.info('Campaign completed successfully!');
  } catch (error) {
    logger.error('Error in main process:', error);
    rl.close();
    process.exit(1);
  }
}

function displayTemplates() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  Available Message Templates               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const templates = MessageGenerator.getAllTemplates();
  
  templates.forEach((template, index) => {
    console.log(`${index + 1}. ${template.name}`);
    console.log(`   Categories: ${template.category.join(', ')}`);
    console.log(`   Template ID: ${template.id}`);
    console.log('\n   Preview:');
    console.log('   ─────────────────────────────────────────────────────────');
    console.log(template.template.split('\n').map(line => '   ' + line).join('\n'));
    console.log('   ─────────────────────────────────────────────────────────\n');
  });
}

// Run the application
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
