# Pattern Scoring

How to detect and score adherence to design trends from the catalog.

## Trend Detection Algorithm

```typescript
interface TrendMatch {
  trend: string;           // Matched trend ID from catalog
  confidence: number;      // 0-1, how certain we are
  adherence: number;       // 0-100, how well it follows the trend
  violations: string[];    // Specific pattern violations
}

function detectTrend(design: DesignAnalysis): TrendMatch {
  const candidates = trends2026.map(trend => ({
    trend: trend.id,
    score: calculateTrendScore(design, trend),
    violations: findViolations(design, trend)
  }));

  const best = candidates.sort((a, b) => b.score - a.score)[0];

  return {
    trend: best.trend,
    confidence: best.score / 100,
    adherence: 100 - (best.violations.length * 10),
    violations: best.violations
  };
}
```

## Trend Signatures

### Neobrutalism

**Must have:**
- Hard shadows (no blur): `box-shadow: Xpx Ypx 0 #000`
- Bold borders: `border: 2-4px solid #000`
- High contrast colors
- Sans-serif typography (preferably bold)

**Must NOT have:**
- Blur in shadows
- Gradients
- Rounded corners (&gt;4px)
- Transparency/opacity
- Thin borders

**Scoring:**
```typescript
const neobrutalismScore = {
  hardShadows: 25,      // Required
  boldBorders: 25,      // Required
  highContrast: 20,     // Required
  sansSerif: 15,        // Preferred
  flatColors: 15        // Required
};

// Violations each deduct 15-25 points:
const violations = {
  blurredShadow: -25,
  gradient: -20,
  roundedCorners: -15,
  transparency: -15
};
```

### Glassmorphism

**Must have:**
- Backdrop blur: `backdrop-filter: blur(10-20px)`
- Semi-transparent backgrounds: `rgba(255,255,255,0.1-0.3)`
- Subtle borders: `border: 1px solid rgba(255,255,255,0.2)`
- Layered depth

**Scoring:**
```typescript
const glassmorphismScore = {
  backdropBlur: 30,
  transparentBg: 25,
  subtleBorder: 20,
  layeredCards: 15,
  lightReflections: 10
};
```

### Neumorphism

**Must have:**
- Soft shadows both directions: dual `box-shadow`
- Matching background color
- Raised/inset effects
- Subtle depth

**Scoring:**
```typescript
const neumorphismScore = {
  dualShadows: 35,
  matchingBg: 25,
  subtleDepth: 20,
  softCorners: 10,
  minimalContrast: 10
};
```

### Claymorphism

**Must have:**
- Soft 3D appearance
- Pastel colors
- Large border radius (20-30px)
- Dual shadows for depth
- Playful, tactile feel

**Scoring:**
```typescript
const claymorphismScore = {
  soft3D: 25,
  pastelColors: 25,
  largeBorderRadius: 20,
  dualShadows: 15,
  playfulElements: 15
};
```

## Component Pattern Matching

When analyzing components, check against catalog patterns:

```typescript
// For a button component
const buttonAnalysis = {
  type: 'button',
  detected: {
    shadow: 'box-shadow: 4px 4px 0 #000',
    border: 'border: 2px solid #000',
    padding: '12px 24px',
    borderRadius: '0'
  },
  matchedPattern: 'neobrutalism-button',
  confidence: 0.92,
  suggestions: [
    "Add hover transform for interaction feedback",
    "Consider :active state with reduced shadow"
  ]
};
```

## Cross-Trend Compatibility

Some trends combine well, others clash:

```typescript
const trendCompatibility = {
  neobrutalism: {
    compatible: ['bold-typography', 'vibrant-colors', 'maximalism'],
    incompatible: ['glassmorphism', 'neumorphism', 'minimalism']
  },
  glassmorphism: {
    compatible: ['dark-mode', 'motion-design', 'minimalism'],
    incompatible: ['neobrutalism', 'maximalism', 'retrofuturism']
  },
  claymorphism: {
    compatible: ['playful-geometric', 'motion-design'],
    incompatible: ['neobrutalism', 'terminal-aesthetic', 'web3']
  }
};
```

## Scoring Output

After analysis, provide:

```markdown
## Pattern Analysis

**Detected Trend:** Neobrutalism
**Confidence:** 92%
**Adherence Score:** 85/100

### Pattern Violations

1. **Gradient detected** (lines 45-47 in hero.css)
   - Found: `background: linear-gradient(...)`
   - Expected: Flat color background
   - Fix: Use solid color from palette

2. **Border radius too large** (button.css:12)
   - Found: `border-radius: 8px`
   - Expected: `border-radius: 0` or max `4px`
   - Fix: Reduce to 0 for pure neobrutalism

### Trend-Consistent Elements

✓ Hard shadows used correctly
✓ Bold black borders
✓ High contrast color palette
✓ Sans-serif typography (Archivo Black)
```
