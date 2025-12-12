# Google Maps to WhatsApp Outreach Tool

An automated tool to scrape business information from Google Maps and send personalized, high-engagement WhatsApp messages to their business WhatsApp numbers.

## 🚀 Features

- **Google Maps Scraper**: Extract business data including name, address, phone, WhatsApp number, rating, and reviews
- **WhatsApp Integration**: Send automated messages using WhatsApp Web
- **Smart Message Templates**: Pre-built, high-engagement message templates for different business categories
- **Personalization**: Automatically personalize messages with business name, location, and rating
- **Rate Limiting**: Built-in delays to avoid being blocked by Google or WhatsApp
- **Export Options**: Save scraped data to CSV or JSON
- **Campaign Tracking**: Track message delivery status and success rates

## 📋 Prerequisites

- Node.js 20+ installed
- A WhatsApp account (for sending messages)
- Chrome/Chromium browser (for Puppeteer)

## 🛠️ Installation

1. Navigate to the project directory:
```bash
cd google-maps-whatsapp-outreach
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Configure your settings in `.env`:
```env
GOOGLE_MAPS_SEARCH_QUERY=restaurants in New York
GOOGLE_MAPS_MAX_RESULTS=20
SENDER_NAME=Your Name
SENDER_COMPANY=Your Company
```

## 🎯 Usage

### Option 1: Interactive Mode (Recommended)

Run the interactive CLI:
```bash
npm run dev
```

Follow the prompts to:
1. Choose operation mode (scrape only, send only, or full automation)
2. Configure search parameters
3. Select message template
4. Preview and confirm before sending

### Option 2: Scrape Only

To only scrape Google Maps data:
```bash
npm run scrape
```

### Option 3: Build and Run

Build the TypeScript code:
```bash
npm run build
```

Run the compiled version:
```bash
npm start
```

## 📱 WhatsApp Setup

1. On first run, a QR code will be displayed in the terminal
2. Open WhatsApp on your phone
3. Go to Settings > Linked Devices > Link a Device
4. Scan the QR code displayed in the terminal
5. The session will be saved for future use

## 💬 Message Templates

The tool includes 6 pre-built message templates:

1. **General Introduction** - Universal template for all businesses
2. **Restaurant Outreach** - Tailored for restaurants and cafes
3. **Retail Business** - For retail stores and shops
4. **Service Business** - For service providers (salons, clinics, etc.)
5. **Value-First Approach** - Leads with free value
6. **Social Proof** - Uses testimonials and results

### Template Variables

Templates support the following variables:
- `{businessName}` - Business name from Google Maps
- `{rating}` - Business rating
- `{location}` - Extracted location/city
- `{senderName}` - Your name
- `{senderCompany}` - Your company name
- `{category}` - Business category

## 📊 Output Files

All output files are saved in the `./output` directory:

- `businesses_[timestamp].csv` - Scraped business data in CSV format
- `businesses_[timestamp].json` - Scraped business data in JSON format
- `campaign_results_[timestamp].json` - Message delivery results

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_MAPS_SEARCH_QUERY` | Search query for Google Maps | "restaurants in New York" |
| `GOOGLE_MAPS_MAX_RESULTS` | Maximum number of results to scrape | 20 |
| `SCRAPE_DELAY` | Delay between scraping each business (ms) | 2000 |
| `MESSAGE_DELAY` | Delay between sending messages (ms) | 5000 |
| `SENDER_NAME` | Your name for message personalization | "Your Name" |
| `SENDER_COMPANY` | Your company name | "Your Company" |
| `OUTPUT_DIR` | Directory for output files | "./output" |
| `LOG_LEVEL` | Logging level (info, debug, error) | "info" |

## 🔒 Best Practices & Compliance

### WhatsApp Business Policies

1. **Opt-in Required**: Only message businesses that have opted in or have a prior relationship
2. **Business Hours**: Send messages during business hours (9 AM - 6 PM)
3. **Rate Limiting**: Don't send more than 50-100 messages per day initially
4. **Quality Content**: Ensure messages provide value and are not spammy
5. **Opt-out Option**: Always include a way for recipients to opt out

### Legal Compliance

- **GDPR**: Ensure you have legal basis for processing business data
- **CAN-SPAM**: Include your business information and opt-out mechanism
- **Local Laws**: Check local regulations regarding automated messaging

### Anti-Spam Measures

- Start with small batches (10-20 messages)
- Increase delays if you notice issues
- Monitor response rates and adjust messaging
- Keep messages professional and valuable

## 🐛 Troubleshooting

### WhatsApp QR Code Not Appearing

- Ensure you have a stable internet connection
- Try deleting the `whatsapp-session` folder and re-authenticating
- Check if port 443 is not blocked by firewall

### Google Maps Scraping Issues

- Google may block automated scraping - use delays and proxies if needed
- Ensure Chrome/Chromium is properly installed
- Try reducing `GOOGLE_MAPS_MAX_RESULTS`

### Messages Not Sending

- Verify the phone number format (should include country code)
- Check if the number is registered on WhatsApp
- Ensure you're not exceeding rate limits
- Verify WhatsApp Web session is active

## 📈 Success Tips

1. **Personalization is Key**: Use business-specific details in messages
2. **Test First**: Send to a few test numbers before bulk sending
3. **Track Results**: Monitor which templates get the best response
4. **Follow Up**: Have a follow-up strategy for interested businesses
5. **Provide Value**: Focus on how you can help, not just selling

## 🔧 Advanced Usage

### Custom Message Templates

Edit `src/messaging/messageTemplates.ts` to add your own templates:

```typescript
{
  id: 'my_custom_template',
  name: 'My Custom Template',
  template: `Hi {businessName}! Your custom message here...`,
  category: ['all'],
}
```

### Programmatic Usage

```typescript
import { GoogleMapsScraper } from './scrapers/googleMapsScraper';
import { WhatsAppClient } from './messaging/whatsappClient';

const scraper = new GoogleMapsScraper();
await scraper.initialize();
const businesses = await scraper.searchBusinesses('coffee shops in LA', 10);

const whatsapp = new WhatsAppClient();
await whatsapp.initialize();
await whatsapp.sendBulkMessages(businesses);
```

## 📝 License

MIT License - feel free to use for commercial purposes

## ⚠️ Disclaimer

This tool is for educational and legitimate business outreach purposes only. Users are responsible for:
- Complying with WhatsApp's Terms of Service
- Following local laws and regulations
- Respecting recipients' privacy and preferences
- Not using the tool for spam or harassment

Use responsibly and ethically!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📧 Support

For issues or questions, please open an issue on the repository.

---

**Happy Outreaching! 🚀**
