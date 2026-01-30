import { BusinessData } from '../scrapers/googleMapsScraper';

export interface MessageTemplate {
  id: string;
  name: string;
  template: string;
  category: string[];
}

export const messageTemplates: MessageTemplate[] = [
  {
    id: 'general_intro',
    name: 'General Introduction',
    template: `Hi {businessName}! 👋

I came across your business on Google Maps and was impressed by your {rating} rating! 

I'm {senderName} from {senderCompany}, and I specialize in helping local businesses like yours grow their online presence and attract more customers.

Would you be interested in a quick chat about how we can help you reach more customers in {location}?

Looking forward to connecting! 🚀`,
    category: ['all'],
  },
  {
    id: 'restaurant_special',
    name: 'Restaurant Outreach',
    template: `Hello {businessName}! 🍽️

I noticed your restaurant while searching for great dining spots in {location}. Your {rating} rating caught my attention!

I'm {senderName}, and I help restaurants increase their online orders and table bookings through digital marketing strategies.

Would you be open to a brief conversation about boosting your visibility and attracting more food lovers to your establishment?

Cheers! 🎉`,
    category: ['restaurant', 'cafe', 'food', 'dining'],
  },
  {
    id: 'retail_outreach',
    name: 'Retail Business Outreach',
    template: `Hi {businessName}! 🛍️

I found your store on Google Maps and love what you're offering in {location}!

I'm {senderName} from {senderCompany}. We help retail businesses like yours increase foot traffic and online sales through targeted marketing campaigns.

Your {rating} rating shows you're doing great work! Would you be interested in learning how we can help you reach even more customers?

Let me know if you'd like to chat! ✨`,
    category: ['retail', 'store', 'shop', 'boutique'],
  },
  {
    id: 'service_business',
    name: 'Service Business Outreach',
    template: `Hello {businessName}! 💼

I came across your business on Google Maps while looking for quality service providers in {location}.

I'm {senderName}, and I help service businesses generate more leads and bookings through digital marketing and automation.

With your {rating} rating, you're clearly providing excellent service. Would you be interested in discussing how to get more clients consistently?

Happy to share some insights! 🎯`,
    category: ['service', 'salon', 'spa', 'clinic', 'repair', 'consulting'],
  },
  {
    id: 'value_proposition',
    name: 'Value-First Approach',
    template: `Hi {businessName}! 👋

Quick question - are you currently using WhatsApp Business features to connect with your customers?

I'm {senderName} from {senderCompany}, and I've helped businesses in {location} increase their customer engagement by 40% using simple WhatsApp automation.

I'd love to share a free tip that could help you get more repeat customers. Interested?

No strings attached! 🎁`,
    category: ['all'],
  },
  {
    id: 'social_proof',
    name: 'Social Proof Message',
    template: `Hello {businessName}! 🌟

I noticed you have an impressive {rating} rating on Google Maps - congratulations!

I'm {senderName}, and I recently helped 3 businesses in {location} double their customer inquiries in just 30 days.

Would you be open to a 10-minute call where I can share exactly what we did? I think it could work really well for your business too.

Let me know! 📈`,
    category: ['all'],
  },
];

export class MessageGenerator {
  static generateMessage(
    business: BusinessData,
    templateId: string,
    senderName: string,
    senderCompany: string
  ): string {
    const template = messageTemplates.find((t) => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template with ID "${templateId}" not found`);
    }

    // Extract location from address
    const location = this.extractLocation(business.address);
    
    // Replace placeholders
    let message = template.template
      .replace(/{businessName}/g, business.name)
      .replace(/{rating}/g, business.rating || 'excellent')
      .replace(/{location}/g, location)
      .replace(/{senderName}/g, senderName)
      .replace(/{senderCompany}/g, senderCompany)
      .replace(/{category}/g, business.category);

    return message;
  }

  static selectTemplateForBusiness(business: BusinessData): string {
    const category = business.category.toLowerCase();

    // Match template based on business category
    for (const template of messageTemplates) {
      if (template.category.includes('all')) continue;
      
      for (const cat of template.category) {
        if (category.includes(cat)) {
          return template.id;
        }
      }
    }

    // Default to general introduction
    return 'general_intro';
  }

  static extractLocation(address: string): string {
    // Extract city or area from address
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    return address;
  }

  static getAllTemplates(): MessageTemplate[] {
    return messageTemplates;
  }

  static getTemplateById(id: string): MessageTemplate | undefined {
    return messageTemplates.find((t) => t.id === id);
  }
}
