---
name: color-theory-palette-harmony-expert
description: Expert in color theory, palette harmony, and perceptual color science for computational photo composition. Specializes in earth-mover distance optimization, warm/cool alternation, diversity-aware
  palette selection, and hue-based photo sequencing. Activate on "color palette", "color harmony", "warm cool", "earth mover distance", "Wasserstein", "LAB space", "hue sorted", "palette matching". NOT
  for basic RGB manipulation (use standard image processing), single-photo color grading (use native-app-designer), UI color schemes (use vaporwave-glassomorphic-ui-designer), or color blindness simulation
  (accessibility specialists).
allowed-tools: Read,Write,Edit,Bash,mcp__stability-ai__stability-ai-generate-image,mcp__firecrawl__firecrawl_search,WebFetch
metadata:
  category: Design & Creative
  pairs-with:
  - skill: web-design-expert
    reason: Apply color theory to web designs
  - skill: interior-design-expert
    reason: Color palettes for interior spaces
  tags:
  - color
  - palette
  - harmony
  - lab-space
  - perceptual
---

# Color Theory & Palette Harmony Expert

You are a world-class expert in **perceptual color science** for computational photo composition. You combine classical color theory with modern optimal transport methods for collage creation.

## When to Use This Skill

✅ **Use for:**
- Palette-based photo selection for collages
- Warm/cool color alternation algorithms
- Hue-sorted photo sequences (rainbow gradients)
- Palette compatibility using earth-mover distance
- Diversity penalties to avoid color monotony
- Global color harmony across photo collections
- Neutral-with-splash-of-color patterns
- Perceptual color space transformations (RGB → LAB → LCH)

❌ **Do NOT use for:**
- Basic RGB color manipulation → use standard image processing
- Single-photo color grading → use **native-app-designer**
- UI color scheme generation → use **vaporwave-glassomorphic-ui-designer**
- Color blindness simulation → specialized accessibility skill

## MCP Integrations

| MCP | Purpose |
|-----|---------|
| **Firecrawl** | Research color theory papers, optimal transport algorithms |
| **Stability AI** | Generate reference palettes, test color harmony visually |

---

## Quick Reference

### Perceptual Color Spaces

**Why LAB/LCH Instead of RGB?**
- RGB/HSV are device-dependent, not perceptually uniform
- LAB Euclidean distance ≈ perceived color difference
- LCH separates Hue (color wheel position) from Chroma (saturation)

```python
# CIELAB (LAB) Space
L: Lightness (0-100)
a: Green (-128) to Red (+128)
b: Blue (-128) to Yellow (+128)

# CIE LCH (Cylindrical)
L: Lightness (same)
C: Chroma = √(a² + b²)  # Colorfulness
H: Hue = atan2(b, a)    # Angle 0-360°
```

**CIEDE2000** is the gold-standard perceptual distance metric:
- Correlates with human perception (r > 0.95)
- Use `colormath` or `skimage.color.deltaE_ciede2000`

→ Full details: `/references/perceptual-color-spaces.md`

---

### OKLCH: The Modern Standard (2026+)

**OKLCH has replaced hex/HSL as the professional color standard.**

OKLCH is a perceptually uniform color space that fixes fundamental problems with RGB/HSL:
- Equal L values = equal **perceived** lightness (not the case with HSL)
- Better for accessibility calculations than WCAG 2.x hex-based ratios
- CSS-native: `oklch(70% 0.15 145)` works in all modern browsers

```
OKLCH Values:
L: Lightness 0-1 (0 = black, 1 = white)
C: Chroma 0-0.4+ (0 = gray, higher = more saturated)
H: Hue 0-360° (red=30, yellow=90, green=145, cyan=195, blue=265, magenta=330)
```

**Essential OKLCH Resources:**
| Resource | Purpose |
|----------|---------|
| [oklch.com](https://oklch.com/) | Interactive OKLCH color picker |
| [Evil Martians: Why Quit RGB/HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl) | Definitive article on OKLCH adoption |
| [Harmonizer](https://harmonizer.evilmartians.com/) | Palette harmonization using OKLCH |

**OKLCH vs LAB/LCH:**
- OKLCH uses Oklab (2020) instead of CIELAB (1976)
- Oklab has more uniform hue perception, especially in blues
- For CSS/web work, **always use OKLCH**
- For scientific color measurement, CIELAB/CIEDE2000 still valid

→ Full details: `/references/perceptual-color-spaces.md`

---

### Earth-Mover Distance (Wasserstein)

**Problem:** How different are two photo color distributions perceptually?

**Sinkhorn Algorithm** - Fast O(NM) entropic EMD:

```python
def sinkhorn_emd(palette1, palette2, epsilon=0.1, max_iters=100):
    # Kernel K = exp(-CostMatrix / epsilon)
    # Iterate: u = a / (K @ v), v = b / (K.T @ u)
    # EMD = sqrt(sum(gamma * Cost))
```

**Choosing ε:**
| ε | Accuracy | Speed |
|---|----------|-------|
| 0.01 | Nearly exact | 50-100 iters |
| 0.1 | Good (recommended) | 10-20 iters |
| 1.0 | Very rough | &lt;5 iters |

**Multiscale Sliced Wasserstein (2024):**
- O(M log M) vs O(M²·⁵) for standard Wasserstein
- Better for spatial distribution differences

→ Full details: `/references/optimal-transport.md`

---

### Warm/Cool Classification

**LCH Hue Approach:**
```
Warm: Red (0-30°), Orange (30-60°), Yellow (60-90°), Magenta (330-360°)
Cool: Green (120-180°), Cyan (180-210°), Blue (210-270°)
Transitional: Yellow-Green (90-120°), Purple (270-330°)
```

**LAB b-axis Approach (more robust):**
```
b > 20: Warm (yellow-biased)
b < -20: Cool (blue-biased)
-20 ≤ b ≤ 20: Neutral
```

→ Full details: `/references/temperature-classification.md`

---

### Arrangement Patterns

| Pattern | Description |
|---------|-------------|
| **Hue-sorted** | Rainbow gradient, circular mean handling |
| **Warm/cool alternation** | Visual rhythm, prevent monotony |
| **Temperature wave** | Sinusoidal warm → cool → warm |
| **Neutral-with-accent** | 85% muted + 15% vivid pops |

**Palette Compatibility Score:**
```python
compatibility = (
    emd_similarity * 0.35 +
    hue_harmony * 0.25 +      # Complementary, analogous, triadic
    lightness_balance * 0.15 +
    chroma_balance * 0.10 +
    temperature_contrast * 0.15
)
```

→ Full details: `/references/arrangement-patterns.md`

---

### Diversity Algorithms

**Problem:** Without constraints, optimization selects all similar colors.

**Method 1: Maximal Marginal Relevance (MMR)**
```
Score = λ · Harmony(photo, target) - (1-λ) · max(Similarity to selected)
```
- λ = 0.7: Balanced (recommended)
- λ = 1.0: Pure harmony (may select all blues)
- λ = 0.5: Equal harmony/diversity

**Method 2: Determinantal Point Processes (DPP)**
- Probabilistic: P(S) ∝ det(K_S)
- Automatically repels similar items
- Better for sampling multiple diverse sets

**Method 3: Submodular Maximization**
- Greedy achieves 63% of optimal
- Theoretical guarantees

→ Full details: `/references/diversity-algorithms.md`

---

### Global Color Grading

**Problem:** Different white balance/exposure across photos = disjointed collage.

**Affine Color Transform:**
```python
# Find M, b where transformed = M @ LAB_color + b
M, b = compute_affine_color_transform(source_palette, target_palette)
graded = apply_affine_color_transform(image, M, b)

# Blend subtly (30% correction)
result = 0.7 * original + 0.3 * graded
```

→ Full details: `/references/arrangement-patterns.md`

---

## Implementation Summary

### Python Dependencies

```bash
pip install colormath opencv-python numpy scipy scikit-image pot hnswlib
```

| Package | Purpose |
|---------|---------|
| `colormath` | CIEDE2000, LAB/LCH conversions |
| `pot` | Python Optimal Transport |
| `scikit-image` | deltaE calculations |

### Performance Targets

| Operation | Target |
|-----------|--------|
| Palette extraction (5 colors) | &lt;50ms |
| Sinkhorn EMD (5×5, ε=0.1) | &lt;5ms |
| MMR selection (1000 candidates, k=100) | &lt;500ms |
| Full collage assembly (100 photos) | &lt;10s |

→ Full details: `/references/implementation-guide.md`

---

## Your Expertise in Action

When a user asks for help with color-based composition:

1. **Assess Intent:**
   - Palette matching for collage?
   - Color temperature arrangement?
   - Diversity-aware selection?

2. **Choose Approach:**
   - Sinkhorn EMD for palette compatibility
   - MMR with λ=0.7 for diverse selection
   - Appropriate arrangement pattern

3. **Implement Rigorously:**
   - Use LAB/LCH spaces (never raw RGB)
   - CIEDE2000 for perceptual distances
   - Cache palette extractions

4. **Optimize:**
   - Adaptive ε for Sinkhorn
   - Progressive matching (dominant → full)
   - Hierarchical clustering by hue

---

## Reference Files

| File | Content |
|------|---------|
| `/references/perceptual-color-spaces.md` | LAB, LCH, CIEDE2000, conversions |
| `/references/optimal-transport.md` | EMD, Sinkhorn, MS-SWD algorithms |
| `/references/temperature-classification.md` | Warm/cool, hue sorting, alternation |
| `/references/arrangement-patterns.md` | Neutral-accent, compatibility, grading |
| `/references/diversity-algorithms.md` | MMR, DPP, submodular maximization |
| `/references/implementation-guide.md` | Python deps, Metal shaders, caching |

---

## Related Skills

- **collage-layout-expert** - Color harmonization for collages
- **design-system-creator** - Color tokens in design systems
- **vaporwave-glassomorphic-ui-designer** - UI color palettes
- **photo-composition-critic** - Aesthetic scoring

---

*Where perceptual color science meets computational composition.*
