# Perceptual Color Spaces

## Why LAB/LCH Instead of RGB/HSV?

RGB and HSV are device-dependent and not perceptually uniform. A ΔE of 10 in one region looks different than ΔE of 10 in another.

## CIELAB (LAB) Space

```
L: Lightness (0 = black, 100 = white)
a: Green (-128) to Red (+128)
b: Blue (-128) to Yellow (+128)
```

**Key Property:** Euclidean distance approximates perceived color difference:
```
ΔE*ab = √((L₂ - L₁)² + (a₂ - a₁)² + (b₂ - b₁)²)
```

## CIE LCH (Cylindrical Representation of LAB)

```
L: Lightness (same as LAB)
C: Chroma = √(a² + b²)  (colorfulness, 0-180)
H: Hue = atan2(b, a)    (angle in degrees, 0-360)
```

**Why LCH for Color Harmony?**
- Hue angle directly corresponds to color wheel position
- Chroma separates colorfulness from hue (easier to classify "vivid" vs "muted")
- Lightness separates brightness independently

**Conversion Chain:**
```python
RGB → sRGB (gamma correction) → XYZ (D65 illuminant) → LAB → LCH
```

---

## CIEDE2000: The Superior Perceptual Metric

The original ΔE*ab formula has perceptual non-uniformities. **CIEDE2000 (published 2001, refined 2025)** addresses:
- Lightness weighting (darker colors appear more different)
- Chroma weighting (high-chroma colors more sensitive)
- Hue rotation (blue region compressed)
- Interaction between lightness, chroma, and hue

**Formula (simplified conceptual form):**
```
ΔE₀₀ = √[(ΔL'/k_L·S_L)² + (ΔC'/k_C·S_C)² + (ΔH'/k_H·S_H)² + R_T·(ΔC'/k_C·S_C)·(ΔH'/k_H·S_H)]
```

Where:
- ΔL', ΔC', ΔH': Weighted lightness, chroma, hue differences
- S_L, S_C, S_H: Weighting functions based on sample location
- k_L, k_C, k_H: Parametric factors (typically 1.0)
- R_T: Rotation term for blue region

**Implementation Notes (Sharma et al., 2005):**
- Use small-angle approximations carefully
- Handle hue discontinuity at 360°/0°
- Numerical stability around neutral axis (C ≈ 0)

**Performance:**
- CIEDE2000 correlates better with human perception (r > 0.95)
- Recommended for all palette distance calculations
- Python: `colormath` library has vetted implementation
- Swift/Metal: Port from Sharma reference implementation

---

## Practical Implementation

**Color Space Conversions:**

Use vetted libraries to avoid bugs:
```python
# Python: colormath
from colormath.color_objects import sRGBColor, LabColor
from colormath.color_conversions import convert_color

rgb = sRGBColor(0.5, 0.3, 0.8)
lab = convert_color(rgb, LabColor)

# Swift/Metal: Custom shaders
```

**CIEDE2000 Implementation:**

```python
# Python: colormath has vetted implementation
from colormath.color_diff import delta_e_cie2000

delta_e = delta_e_cie2000(lab1, lab2)

# Or use skimage
from skimage.color import deltaE_ciede2000
delta_e = deltaE_ciede2000(lab1, lab2)
```

**Palette Extraction:**

K-means in LAB space with smart initialization:
```python
from sklearn.cluster import KMeans

# Convert image to LAB
image_lab = rgb_to_lab(image)
pixels = image_lab.reshape(-1, 3)

# Sample pixels (for large images)
if len(pixels) > 10000:
    indices = np.random.choice(len(pixels), 10000, replace=False)
    pixels = pixels[indices]

# K-means with k-means++ initialization
kmeans = KMeans(n_clusters=5, init='k-means++', n_init=10, random_state=42)
kmeans.fit(pixels)

# Palette = cluster centers
palette = kmeans.cluster_centers_  # (5, 3) in LAB space

# Weights = cluster sizes
labels = kmeans.labels_
weights = np.bincount(labels) / len(labels)
```

---

## Handling Edge Cases

```python
# Grayscale images (low chroma)
if avg_chroma < 5:
    # Treat as neutral, use lightness-based matching only
    return lightness_only_compatibility(palette1, palette2)

# Single-color images (very low entropy)
if palette_entropy(palette) < 0.5:
    # Dominant color match
    return dominant_color_distance(palette1[0], palette2[0])

# Very dark/light images (extreme lightness)
if avg_lightness < 10 or avg_lightness > 90:
    # Relax lightness balance constraint
    scores['lightness_balance'] *= 0.5
```

---

## References

- Sharma, G., Wu, W., & Dalal, E. N. (2005). "The CIEDE2000 color-difference formula: Implementation notes, supplementary test data, and mathematical observations." Color Research & Application.
- Fairchild, M. D. (2013). "Color Appearance Models" (3rd ed.).
