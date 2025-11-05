# Examples

This directory contains example scripts demonstrating different use cases and features of the Google Maps to WhatsApp Outreach Tool.

## 📁 Available Examples

### 1. Basic Usage (`basic-usage.ts`)

**What it does:**
- Scrapes Google Maps for businesses
- Filters businesses with WhatsApp
- Sends messages using built-in templates
- Exports results

**Run it:**
```bash
cd google-maps-whatsapp-outreach
npx ts-node examples/basic-usage.ts
```

**Best for:**
- First-time users
- Simple, straightforward campaigns
- Learning the basic workflow

---

### 2. Advanced Usage (`advanced-usage.ts`)

**What it does:**
- Scrapes multiple business categories
- Advanced filtering (rating, review count)
- Segments businesses by type
- A/B testing with different templates
- Detailed analytics

**Run it:**
```bash
npx ts-node examples/advanced-usage.ts
```

**Best for:**
- Experienced users
- Multi-segment campaigns
- Testing different approaches
- Data-driven marketing

---

### 3. Custom Templates (`custom-template.ts`)

**What it does:**
- Creates custom message templates
- Dynamic template selection
- Seasonal/contextual messaging
- Emoji-rich messages

**Run it:**
```bash
npx ts-node examples/custom-template.ts
```

**Best for:**
- Unique messaging needs
- Seasonal campaigns
- Brand-specific communication
- Creative marketers

---

## 🎯 Use Case Examples

### Use Case 1: Local Restaurant Outreach

**Goal:** Offer online ordering system to restaurants

```typescript
import { GoogleMapsScraper } from '../src/scrapers/googleMapsScraper';
import { WhatsAppClient } from '../src/messaging/whatsappClient';

const scraper = new GoogleMapsScraper();
await scraper.initialize();

// Target restaurants in specific area
const restaurants = await scraper.searchBusinesses(
  'restaurants in downtown Miami',
  50
);

// Filter for high-rated restaurants
const qualityRestaurants = restaurants.filter(r => 
  parseFloat(r.rating) >= 4.0 && r.whatsappNumber
);

const whatsapp = new WhatsAppClient();
await whatsapp.initialize();

// Send restaurant-specific template
await whatsapp.sendBulkMessages(
  qualityRestaurants,
  'restaurant_special',
  'Your Name',
  'Online Ordering Solutions'
);
```

---

### Use Case 2: Multi-City Campaign

**Goal:** Reach businesses across multiple cities

```typescript
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston'];
const businessType = 'coffee shops';

let allBusinesses = [];

for (const city of cities) {
  const query = `${businessType} in ${city}`;
  const businesses = await scraper.searchBusinesses(query, 20);
  
  // Tag with city for personalization
  businesses.forEach(b => b.city = city);
  allBusinesses.push(...businesses);
  
  await delay(10000); // Wait between cities
}

// Send city-specific messages
for (const business of allBusinesses) {
  const message = `Hi ${business.name}! 
  
I'm reaching out to top ${businessType} in ${business.city}...`;
  
  await whatsapp.sendMessage(business.whatsappNumber, message);
}
```

---

### Use Case 3: Follow-Up Campaign

**Goal:** Send follow-up messages to non-responders

```typescript
import fs from 'fs';

// Load previous campaign results
const previousResults = JSON.parse(
  fs.readFileSync('output/campaign_results_2024-11-01.json', 'utf-8')
);

// Find businesses that received message but didn't respond
const nonResponders = previousResults.filter(r => 
  r.success && !r.responded // You'd track responses separately
);

// Send gentle follow-up after 3 days
const followUpMessage = (business) => `
Hi ${business.name}! 👋

I reached out a few days ago about helping you grow your online presence.

I understand you're busy running your business! 

If you're interested, I'd love to share a quick 2-minute video showing what we do.

No pressure at all - just want to make sure you saw my message.

Cheers!
`;

// Send follow-ups with longer delays
for (const result of nonResponders) {
  await whatsapp.sendMessage(
    result.business.whatsappNumber,
    followUpMessage(result.business)
  );
  await delay(30000); // 30 seconds between follow-ups
}
```

---

### Use Case 4: Niche Targeting

**Goal:** Target very specific business types

```typescript
// Target businesses with specific keywords
const niches = [
  'vegan restaurants',
  'organic cafes',
  'farm-to-table restaurants',
  'sustainable food'
];

let nicheBusinesses = [];

for (const niche of niches) {
  const businesses = await scraper.searchBusinesses(
    `${niche} in Portland`,
    15
  );
  nicheBusinesses.push(...businesses);
}

// Custom message for sustainability-focused businesses
const sustainabilityMessage = (business) => `
🌱 Hi ${business.name}!

I came across your business while looking for sustainable food businesses in Portland.

Your commitment to ${business.category.toLowerCase()} is inspiring! 

I help eco-conscious businesses like yours reach more customers who share your values.

Would you be interested in learning how we've helped similar businesses increase their customer base by 40%?

Looking forward to connecting!

- Green Marketing Co.
`;
```

---

### Use Case 5: Time-Based Campaigns

**Goal:** Send messages at optimal times

```typescript
import schedule from 'node-schedule';

// Schedule messages for optimal times
const optimalTimes = {
  restaurants: '14:00', // 2 PM (between lunch and dinner)
  retail: '10:00',      // 10 AM (morning)
  services: '11:00',    // 11 AM (mid-morning)
};

// Schedule restaurant outreach for 2 PM
schedule.scheduleJob('0 14 * * 2-4', async () => {
  // Tuesday-Thursday at 2 PM
  logger.info('Starting scheduled restaurant campaign...');
  
  const restaurants = await scraper.searchBusinesses(
    'restaurants in Austin',
    20
  );
  
  await whatsapp.sendBulkMessages(
    restaurants.filter(r => r.whatsappNumber),
    'restaurant_special',
    'Your Name',
    'Your Company'
  );
});
```

---

## 🛠️ Customization Tips

### Creating Your Own Templates

```typescript
// Add to src/messaging/messageTemplates.ts
export const myCustomTemplate: MessageTemplate = {
  id: 'my_template',
  name: 'My Custom Template',
  template: `
Hi {businessName}! 🎯

[Your custom message here]

Variables available:
- {businessName}
- {rating}
- {location}
- {senderName}
- {senderCompany}
- {category}

Best regards,
{senderName}
  `,
  category: ['all'],
};
```

### Custom Filtering Logic

```typescript
// Filter by multiple criteria
const targetBusinesses = businesses.filter(business => {
  // Must have WhatsApp
  if (!business.whatsappNumber) return false;
  
  // Rating between 4.0 and 4.5 (room for improvement)
  const rating = parseFloat(business.rating);
  if (rating < 4.0 || rating > 4.5) return false;
  
  // Has reviews but not too many (not too established)
  const reviews = parseInt(business.reviewCount);
  if (reviews < 20 || reviews > 200) return false;
  
  // Specific categories
  const targetCategories = ['restaurant', 'cafe', 'bar'];
  const hasTargetCategory = targetCategories.some(cat =>
    business.category.toLowerCase().includes(cat)
  );
  
  return hasTargetCategory;
});
```

### Dynamic Message Generation

```typescript
function generateDynamicMessage(business: BusinessData): string {
  const rating = parseFloat(business.rating);
  const reviews = parseInt(business.reviewCount);
  
  // Different messages based on business metrics
  if (rating >= 4.5 && reviews > 100) {
    return `Hi ${business.name}! Your ${rating} rating with ${reviews} reviews is outstanding! Let's help you reach even more customers...`;
  } else if (rating >= 4.0 && reviews < 50) {
    return `Hi ${business.name}! I see you're building a great reputation with your ${rating} rating. Let's help you get more reviews...`;
  } else {
    return `Hi ${business.name}! I'd love to help you improve your online presence...`;
  }
}
```

---

## 📊 Tracking and Analytics

### Save Campaign Metrics

```typescript
interface CampaignMetrics {
  date: Date;
  totalSent: number;
  successful: number;
  failed: number;
  successRate: number;
  template: string;
  segment: string;
}

const metrics: CampaignMetrics = {
  date: new Date(),
  totalSent: results.length,
  successful: results.filter(r => r.success).length,
  failed: results.filter(r => !r.success).length,
  successRate: (successful / totalSent) * 100,
  template: 'restaurant_special',
  segment: 'restaurants',
};

// Save for analysis
fs.writeFileSync(
  `metrics/campaign_${Date.now()}.json`,
  JSON.stringify(metrics, null, 2)
);
```

---

## 🚀 Next Steps

1. **Start with basic-usage.ts** to understand the workflow
2. **Experiment with custom-template.ts** to create your own messages
3. **Use advanced-usage.ts** for complex campaigns
4. **Build your own scripts** based on these examples

## 💡 Pro Tips

- Always test with a small batch first (5-10 businesses)
- Monitor response rates and adjust templates
- Respect rate limits to avoid being blocked
- Keep messages valuable and non-spammy
- Track which templates perform best

---

**Happy Outreaching! 🎯**
