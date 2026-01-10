# Quick Start Guide

Get started with the Google Maps to WhatsApp Outreach Tool in 5 minutes!

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd google-maps-whatsapp-outreach
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your details:
```env
GOOGLE_MAPS_SEARCH_QUERY=coffee shops in San Francisco
GOOGLE_MAPS_MAX_RESULTS=10
SENDER_NAME=John Doe
SENDER_COMPANY=Digital Marketing Pro
```

### 3. Run the Tool
```bash
npm run dev
```

## 📱 First Time WhatsApp Setup

1. When you run the tool, you'll see a QR code in the terminal
2. Open WhatsApp on your phone
3. Go to: **Settings → Linked Devices → Link a Device**
4. Scan the QR code
5. Done! Your session is saved for future use

## 🎯 Usage Scenarios

### Scenario 1: Just Scrape Data (No Messaging)

Perfect for building a database of businesses first.

```bash
npm run dev
```

Choose option: **1. Scrape Google Maps only**

- Enter your search query (e.g., "restaurants in Miami")
- Enter max results (e.g., 20)
- Data will be saved to `output/businesses_[timestamp].csv`

### Scenario 2: Send Messages to Existing Data

Already have scraped data? Send messages without scraping again.

```bash
npm run dev
```

Choose option: **2. Send WhatsApp messages only**

- Select your data file from the list
- Choose a message template
- Preview and confirm
- Messages will be sent!

### Scenario 3: Full Automation

Scrape and send messages in one go.

```bash
npm run dev
```

Choose option: **3. Full automation**

- Configure search parameters
- Select message template
- Preview message
- Confirm and send!

## 💬 Choosing the Right Template

| Template | Best For | Example Use Case |
|----------|----------|------------------|
| General Introduction | Any business | General outreach |
| Restaurant Outreach | Restaurants, cafes | Food delivery services |
| Retail Business | Stores, boutiques | E-commerce solutions |
| Service Business | Salons, clinics | Booking systems |
| Value-First | All businesses | Offering free consultation |
| Social Proof | All businesses | When you have testimonials |

## 📊 Understanding Results

After sending messages, you'll see:

```
╔════════════════════════════════════════════════════════════╗
║                    Campaign Summary                        ║
╚════════════════════════════════════════════════════════════╝
✅ Successful: 15
❌ Failed: 5
📊 Success Rate: 75.00%
📁 Results saved to: campaign_results_2024-11-05.json
```

### Common Failure Reasons:
- **No WhatsApp number available**: Business doesn't have WhatsApp
- **Number not registered on WhatsApp**: Phone number isn't on WhatsApp
- **Invalid phone number format**: Number format is incorrect

## 🎨 Customizing Messages

### Quick Personalization

Messages automatically include:
- Business name
- Location/city
- Rating
- Your name and company

### Example Output:

**Input Template:**
```
Hi {businessName}! 👋

I noticed your {rating} rating on Google Maps...
```

**Actual Message Sent:**
```
Hi Joe's Coffee Shop! 👋

I noticed your 4.8 rating on Google Maps...
```

## ⚡ Pro Tips

### 1. Start Small
Begin with 10-20 businesses to test your message and approach.

### 2. Best Times to Send
- **B2B**: Tuesday-Thursday, 10 AM - 4 PM
- **B2C**: Monday-Friday, 9 AM - 6 PM
- **Restaurants**: Tuesday-Thursday, 2 PM - 4 PM (between lunch and dinner)

### 3. Rate Limiting
Default delays:
- **Scraping**: 2 seconds between businesses
- **Messaging**: 5 seconds between messages

Increase these if you're getting blocked:
```env
SCRAPE_DELAY=5000
MESSAGE_DELAY=10000
```

### 4. A/B Testing
Try different templates and track which gets better responses:
1. Send 10 messages with Template A
2. Send 10 messages with Template B
3. Compare response rates
4. Use the winner for bulk sending

### 5. Follow-Up Strategy
- Wait 2-3 days for responses
- Send a gentle follow-up to non-responders
- Don't send more than 2 messages to the same business

## 🔍 Troubleshooting

### "QR Code not appearing"
```bash
# Delete session and try again
rm -rf whatsapp-session
npm run dev
```

### "No businesses found"
- Try a more specific search query
- Check your internet connection
- Google Maps might be blocking - try again later

### "Messages not sending"
- Verify WhatsApp session is active
- Check phone number format includes country code
- Reduce MESSAGE_DELAY if too slow
- Increase MESSAGE_DELAY if getting blocked

### "Build errors"
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📈 Scaling Up

### Week 1: Testing Phase
- Send 10-20 messages per day
- Test different templates
- Track response rates

### Week 2: Optimization
- Use best-performing template
- Increase to 30-50 messages per day
- Refine targeting

### Week 3+: Scale
- Send 50-100 messages per day
- Segment by business category
- Automate follow-ups

## 🎯 Success Metrics

Track these metrics in your campaign results:

1. **Delivery Rate**: % of messages successfully sent
2. **Response Rate**: % of recipients who reply
3. **Conversion Rate**: % who become customers
4. **Best Template**: Which template performs best
5. **Best Time**: When you get most responses

## 🚨 Important Reminders

✅ **DO:**
- Provide genuine value
- Personalize messages
- Respect business hours
- Include opt-out option
- Track and improve

❌ **DON'T:**
- Send spam
- Use aggressive language
- Message same business multiple times
- Send during off-hours
- Ignore opt-out requests

## 🆘 Need Help?

1. Check the main [README.md](README.md) for detailed documentation
2. Review error logs in `error.log` and `combined.log`
3. Open an issue on the repository

---

**Ready to start? Run `npm run dev` and follow the prompts!** 🚀
