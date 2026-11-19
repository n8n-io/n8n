# Implementation Guide

## Python Dependencies

```bash
pip install colormath opencv-python numpy scipy scikit-image scikit-learn pot hnswlib
```

| Package | Purpose |
|---------|---------|
| `colormath` | CIEDE2000 implementation, LAB/LCH conversions |
| `opencv-python` | Image color extraction, histogram analysis |
| `scikit-image` | deltaE calculations, color space transforms |
| `numpy` | Numerical computing |
| `scipy` | Optimization for EMD/Wasserstein |
| `scikit-learn` | K-means for palette extraction |
| `pot` | Python Optimal Transport |
| `hnswlib` | Fast k-NN search |

---

## Performance Targets

**Swift/Metal implementation:**

```
Palette extraction (5 colors): < 50ms per photo
Sinkhorn EMD (5×5 palettes, ε=0.1): < 5ms
MS-SWD (100 projections, 3 scales): < 20ms
MMR selection (1000 candidates, k=100): < 500ms
Global color grading (1000×1000 image): < 100ms
Full collage assembly (100 photos): < 10 seconds
```

---

## GPU Acceleration (Metal Shaders)

### Compute EMD in Parallel (Cost Matrix)

```metal
kernel void compute_cost_matrix(
    constant float3 *palette1 [[buffer(0)]],
    constant float3 *palette2 [[buffer(1)]],
    device float *cost_matrix [[buffer(2)]],
    uint2 gid [[thread_position_in_grid]]
) {
    uint i = gid.x;
    uint j = gid.y;

    // CIEDE2000 distance (simplified)
    float3 c1 = palette1[i];
    float3 c2 = palette2[j];

    float dL = c1.x - c2.x;
    float da = c1.y - c2.y;
    float db = c1.z - c2.z;

    float delta_e = sqrt(dL*dL + da*da + db*db);
    cost_matrix[i * palette2_size + j] = delta_e * delta_e;
}
```

### Sinkhorn Iterations on GPU

```metal
kernel void sinkhorn_iteration_u(
    constant float *K [[buffer(0)]],
    constant float *v [[buffer(1)]],
    constant float *a [[buffer(2)]],
    device float *u [[buffer(3)]],
    uint i [[thread_position_in_grid]]
) {
    // u[i] = a[i] / (K[i, :] @ v)
    float sum = 0.0;
    for (uint j = 0; j < v_size; j++) {
        sum += K[i * v_size + j] * v[j];
    }
    u[i] = a[i] / sum;
}
```

---

## Caching

```python
class PaletteCache:
    """Cache extracted palettes to avoid recomputation."""

    def __init__(self):
        self.cache = {}  # photo_id -> palette_LAB

    def get_or_extract(self, photo_id, image):
        if photo_id not in self.cache:
            self.cache[photo_id] = extract_palette(image)
        return self.cache[photo_id]
```

---

## Common Patterns

### Pattern 1: Progressive Color Matching

```python
# Start with dominant color match, refine with full palette
def find_matches_progressive(query_palette, candidates, k=20):
    # Stage 1: Filter by dominant color (fast)
    dom_matches = [c for c in candidates
                   if ciede2000(query_palette[0], c.palette[0]) < 30]

    # Stage 2: Full EMD on remaining (slower)
    scored = [(sinkhorn_emd(query_palette, c.palette), c)
              for c in dom_matches]
    scored.sort()

    return [c for _, c in scored[:k]]
```

### Pattern 2: Hierarchical Palette Matching

```python
# Cluster photos by dominant hue, search within cluster first
def cluster_photos_by_hue(photos):
    hues = [dominant_hue(palette) for _, palette in photos]

    # K-means clustering in circular hue space
    from sklearn.cluster import KMeans

    # Convert hue angles to 2D points on unit circle
    hue_points = np.array([[np.cos(np.radians(h)), np.sin(np.radians(h))]
                           for h in hues])

    kmeans = KMeans(n_clusters=12, random_state=42)  # 12 = clock positions
    labels = kmeans.fit_predict(hue_points)

    # Group photos by cluster
    clusters = {}
    for (photo_id, palette), label in zip(photos, labels):
        clusters.setdefault(label, []).append((photo_id, palette))

    return clusters
```

---

## Advanced Techniques

### Dynamic Palette Evolution

Track global palette as collage grows, adjust target:

```python
global_palette = seed_palette.copy()

for iteration in range(n_photos):
    # Select next photo matching current global palette
    next_photo = select_best_match(global_palette, candidates, diversity_lambda)

    # Update global palette (exponential moving average)
    alpha = 0.1  # Learning rate
    global_palette = (1 - alpha) * global_palette + alpha * next_photo.palette
```

### Color Mood Transfer

Given a reference artwork, extract mood and apply:

```python
def extract_color_mood(reference_image):
    """Extract color mood from reference (e.g., Rothko painting)."""
    palette = extract_palette(reference_image, n_colors=5)
    palette_lch = lab_to_lch(palette)

    avg_L = np.mean([L for L, C, H, w in palette_lch])
    avg_C = np.mean([C for L, C, H, w in palette_lch])
    hue_variance = np.var([H for L, C, H, w in palette_lch])

    return {
        'target_palette': palette,
        'lightness': avg_L,
        'saturation': avg_C,
        'hue_diversity': hue_variance
    }

def apply_mood_to_collage(photos, mood):
    """Select and grade photos to match mood."""
    # Select photos with similar lightness/saturation
    filtered = [p for p in photos
                if abs(avg_lightness(p.palette) - mood['lightness']) < 20
                and abs(avg_chroma(p.palette) - mood['saturation']) < 20]

    # Apply color grading to match target palette
    for photo in filtered:
        M, b = compute_affine_color_transform(photo.palette, mood['target_palette'])
        photo.image = apply_affine_color_transform(photo.image, M, b)

    return filtered
```

### Color Constancy Correction

Photos from different cameras/lighting have different white balance. Normalize:

```python
def normalize_white_balance(image):
    """Estimate and correct white balance using gray world assumption."""
    # Convert to LAB
    lab = rgb_to_lab(image)

    # Compute mean a, b (should be ~0 for neutral)
    mean_a = np.mean(lab[:, :, 1])
    mean_b = np.mean(lab[:, :, 2])

    # Subtract mean (shift to neutral)
    lab[:, :, 1] -= mean_a
    lab[:, :, 2] -= mean_b

    return lab_to_rgb(lab)
```

---

## Troubleshooting

### Issue: EMD too slow for large palettes

**Solution:** Use Multiscale Sliced Wasserstein instead of Sinkhorn for O(M log M) complexity.

### Issue: Photos look washed out after color grading

**Solution:** Reduce alpha blend strength or add chroma boost:
```python
graded_image[:, :, 1:] *= 1.1  # Boost a, b channels by 10%
```

---

## References

1. Peyré, G., & Cuturi, M. (2019). "Computational Optimal Transport."
2. Sharma, G., et al. (2005). "The CIEDE2000 color-difference formula."
3. "Multiscale Sliced Wasserstein Distances" (ECCV 2024)
4. Kulesza, A., & Taskar, B. (2012). "Determinantal Point Processes for Machine Learning."
5. Itten, J. (1970). "The Elements of Color."
6. Fairchild, M. D. (2013). "Color Appearance Models" (3rd ed.).
