# JSON-LD Schema Templates

Copy-paste JSON-LD structured data for different content types. Place in `<script type="application/ld+json">` tags.

## Software Application

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Your App Name",
  "description": "Clear description of what your software does",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Web, macOS, Windows, Linux",
  "url": "https://yourapp.com",
  "downloadUrl": "https://yourapp.com/download",
  "screenshot": "https://yourapp.com/screenshot.png",
  "softwareVersion": "2.0.0",
  "datePublished": "2024-01-15",
  "author": {
    "@type": "Organization",
    "name": "Your Company",
    "url": "https://yourcompany.com"
  },
  "offers": {
    "@type": "Offer",
    "price": "29.00",
    "priceCurrency": "USD",
    "priceValidUntil": "2025-12-31"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "1250"
  }
}
```

**Application categories:**
- `DeveloperApplication`
- `DesignApplication`
- `BusinessApplication`
- `ProductivityApplication`
- `UtilitiesApplication`
- `SecurityApplication`

## Organization / Company

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Company Name",
  "alternateName": "Short Name",
  "url": "https://yourcompany.com",
  "logo": "https://yourcompany.com/logo.png",
  "description": "What your company does",
  "foundingDate": "2020-01-01",
  "founders": [
    {
      "@type": "Person",
      "name": "Founder Name"
    }
  ],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "postalCode": "94102",
    "addressCountry": "US"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "support@yourcompany.com",
    "url": "https://yourcompany.com/contact"
  },
  "sameAs": [
    "https://twitter.com/yourcompany",
    "https://linkedin.com/company/yourcompany",
    "https://github.com/yourcompany"
  ]
}
```

## Article / Blog Post

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Your Article Title",
  "description": "Article description for search results",
  "image": "https://yoursite.com/article-image.jpg",
  "datePublished": "2024-01-15T08:00:00+00:00",
  "dateModified": "2024-01-20T10:30:00+00:00",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "url": "https://yoursite.com/author/name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Your Site Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://yoursite.com/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://yoursite.com/blog/article-slug"
  }
}
```

**For technical articles, add:**
```json
{
  "articleSection": "Tutorials",
  "wordCount": 2500,
  "about": {
    "@type": "Thing",
    "name": "React Hooks"
  }
}
```

## FAQ Page

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is your product?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our product is a tool that helps developers..."
      }
    },
    {
      "@type": "Question",
      "name": "How much does it cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer a free tier for individuals. Paid plans start at $29/month."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a free trial?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, all paid plans include a 14-day free trial. No credit card required."
      }
    }
  ]
}
```

## How-To Guide

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Set Up Your Development Environment",
  "description": "Step-by-step guide to setting up a modern development environment",
  "image": "https://yoursite.com/howto-image.jpg",
  "totalTime": "PT30M",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": "0"
  },
  "supply": [
    {
      "@type": "HowToSupply",
      "name": "VS Code"
    },
    {
      "@type": "HowToSupply",
      "name": "Node.js 20+"
    }
  ],
  "tool": [
    {
      "@type": "HowToTool",
      "name": "Terminal"
    }
  ],
  "step": [
    {
      "@type": "HowToStep",
      "name": "Install Node.js",
      "text": "Download and install Node.js from nodejs.org",
      "url": "https://yoursite.com/guide#step1",
      "image": "https://yoursite.com/step1.jpg"
    },
    {
      "@type": "HowToStep",
      "name": "Install VS Code",
      "text": "Download VS Code from code.visualstudio.com",
      "url": "https://yoursite.com/guide#step2",
      "image": "https://yoursite.com/step2.jpg"
    }
  ]
}
```

## Course / Learning Resource

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Complete React Developer Course",
  "description": "Learn React from scratch and build production apps",
  "provider": {
    "@type": "Organization",
    "name": "Your Academy",
    "sameAs": "https://youracademy.com"
  },
  "educationalLevel": "Intermediate",
  "courseCode": "REACT-101",
  "numberOfCredits": 0,
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "online",
    "courseWorkload": "PT40H"
  },
  "offers": {
    "@type": "Offer",
    "price": "99.00",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "523"
  }
}
```

## Product (Physical or Digital)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": [
    "https://yoursite.com/product-1.jpg",
    "https://yoursite.com/product-2.jpg"
  ],
  "brand": {
    "@type": "Brand",
    "name": "Your Brand"
  },
  "sku": "PROD-001",
  "mpn": "12345678",
  "offers": {
    "@type": "Offer",
    "url": "https://yoursite.com/product",
    "price": "49.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "priceValidUntil": "2025-12-31",
    "seller": {
      "@type": "Organization",
      "name": "Your Store"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "89"
  },
  "review": [
    {
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5"
      },
      "author": {
        "@type": "Person",
        "name": "Happy Customer"
      },
      "reviewBody": "This product changed my workflow completely!"
    }
  ]
}
```

## Breadcrumb Navigation

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://yoursite.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Documentation",
      "item": "https://yoursite.com/docs"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Getting Started",
      "item": "https://yoursite.com/docs/getting-started"
    }
  ]
}
```

## Website (Search Box)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Your Site Name",
  "url": "https://yoursite.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://yoursite.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

## Video

```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "Video Title",
  "description": "Video description",
  "thumbnailUrl": "https://yoursite.com/video-thumbnail.jpg",
  "uploadDate": "2024-01-15T08:00:00+00:00",
  "duration": "PT10M30S",
  "contentUrl": "https://yoursite.com/video.mp4",
  "embedUrl": "https://www.youtube.com/embed/VIDEO_ID",
  "author": {
    "@type": "Person",
    "name": "Creator Name"
  }
}
```

## Implementation in React/Next.js

```tsx
// components/StructuredData.tsx
export function StructuredData({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Usage in page
import { StructuredData } from '@/components/StructuredData';

export default function ProductPage() {
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    // ... schema data
  };

  return (
    <>
      <StructuredData data={productSchema} />
      {/* Page content */}
    </>
  );
}
```

## Validation Tools

- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Schema.org Validator**: https://validator.schema.org/
- **JSON-LD Playground**: https://json-ld.org/playground/

## Common Mistakes

1. **Invalid JSON** - Always validate before deploying
2. **Missing required fields** - Check schema.org documentation
3. **Wrong @type** - Use exact schema.org type names
4. **Fake ratings** - Only use real aggregate ratings
5. **Outdated dates** - Keep dateModified current
