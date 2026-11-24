# Color Arrangement Patterns

## Neutral-with-Splash-of-Color Pattern

**Design Principle:** Create visual impact by surrounding neutral/muted photos with occasional vibrant accents.

### Metrics

**Chroma (Colorfulness):**
```python
def compute_average_chroma(palette_LCH):
    """Average chroma weighted by pixel abundance."""
    total_weight = sum(w for L, C, H, w in palette_LCH)
    avg_chroma = sum(C * w for L, C, H, w in palette_LCH) / total_weight
    return avg_chroma
```

**Classification:**
```
Chroma < 20: Neutral/Muted
20 ≤ Chroma < 50: Moderate
Chroma ≥ 50: Vivid/Saturated
```

### Arrangement Algorithm

```python
def neutral_with_accents_pattern(photos_with_palettes, accent_ratio=0.15):
    """
    Arrange photos with neutral background and vivid accents.

    Args:
        photos_with_palettes: [(photo_id, palette_LCH), ...]
        accent_ratio: Target proportion of vivid photos (e.g., 0.15 = 15%)

    Returns:
        List of photo_ids with accents strategically placed
    """
    # Classify by chroma
    neutral = []  # Chroma < 20
    moderate = []  # 20 ≤ Chroma < 50
    vivid = []  # Chroma ≥ 50

    for photo_id, palette in photos_with_palettes:
        avg_chroma = compute_average_chroma(palette)

        if avg_chroma < 20:
            neutral.append((photo_id, avg_chroma))
        elif avg_chroma < 50:
            moderate.append((photo_id, avg_chroma))
        else:
            vivid.append((photo_id, avg_chroma))

    # Sort vivid by chroma (most saturated first)
    vivid.sort(key=lambda x: -x[1])

    # Determine number of accents
    total_photos = len(neutral) + len(moderate) + len(vivid)
    target_accents = int(total_photos * accent_ratio)
    accents = [pid for pid, _ in vivid[:target_accents]]

    # Remaining vivid become moderate
    moderate.extend((pid, c) for pid, c in vivid[target_accents:])

    # Create base arrangement (neutral + moderate)
    base = [pid for pid, _ in neutral] + [pid for pid, _ in moderate]
    random.shuffle(base)

    # Insert accents evenly
    result = []
    accent_step = len(base) / (len(accents) + 1) if accents else 0

    base_idx = 0
    accent_idx = 0

    for i in range(total_photos):
        if accent_idx < len(accents) and i >= (accent_idx + 1) * accent_step:
            result.append(accents[accent_idx])
            accent_idx += 1
        elif base_idx < len(base):
            result.append(base[base_idx])
            base_idx += 1

    return result
```

**Visual Effect:** Neutral photos form calm baseline, vivid photos create "pops" of visual interest at regular intervals.

---

## Palette Compatibility Scoring

**Goal:** Given two photos, compute how well their palettes work together in a collage.

### Multi-Factor Score

```python
def palette_compatibility(palette1_LAB, palette2_LAB):
    """
    Comprehensive palette compatibility score.

    Returns:
        float: 0-1 score (higher = more compatible)
        dict: Breakdown of sub-scores
    """
    # Convert to LCH for hue analysis
    palette1_LCH = lab_to_lch(palette1_LAB)
    palette2_LCH = lab_to_lch(palette2_LAB)

    scores = {}

    # 1. EMD (Wasserstein) distance in LAB space
    emd = sinkhorn_emd(palette1_LAB, palette2_LAB, epsilon=0.1)
    scores['emd_similarity'] = np.exp(-emd / 50)  # Convert to similarity

    # 2. Hue harmony (complementary, analogous, etc.)
    scores['hue_harmony'] = compute_hue_harmony(palette1_LCH, palette2_LCH)

    # 3. Lightness balance
    avg_L1 = np.mean([L for L, C, H, w in palette1_LCH])
    avg_L2 = np.mean([L for L, C, H, w in palette2_LCH])
    scores['lightness_balance'] = 1 - abs(avg_L1 - avg_L2) / 100

    # 4. Chroma balance
    avg_C1 = np.mean([C for L, C, H, w in palette1_LCH])
    avg_C2 = np.mean([C for L, C, H, w in palette2_LCH])
    scores['chroma_balance'] = 1 - abs(avg_C1 - avg_C2) / 100

    # 5. Temperature compatibility (prefer contrast)
    temp1 = temperature_score_LAB(palette1_LAB)
    temp2 = temperature_score_LAB(palette2_LAB)
    temp_diff = abs(temp1 - temp2)
    scores['temperature_contrast'] = temp_diff  # Higher contrast = better

    # 6. Overall compatibility (weighted sum)
    compatibility = (
        scores['emd_similarity'] * 0.35 +
        scores['hue_harmony'] * 0.25 +
        scores['lightness_balance'] * 0.15 +
        scores['chroma_balance'] * 0.10 +
        scores['temperature_contrast'] * 0.15
    )

    return compatibility, scores
```

---

## Hue Harmony Analysis

```python
def compute_hue_harmony(palette1_LCH, palette2_LCH):
    """
    Score hue relationships (complementary, analogous, triadic).
    """
    # Extract dominant hues (weight by chroma)
    hues1 = [H for L, C, H, w in palette1_LCH if C > 10]
    hues2 = [H for L, C, H, w in palette2_LCH if C > 10]

    if not hues1 or not hues2:
        return 0.5  # Neutral score for near-grayscale

    best_harmony = 0

    for h1 in hues1[:3]:  # Check top 3 hues
        for h2 in hues2[:3]:
            diff = abs(h1 - h2)
            if diff > 180:
                diff = 360 - diff

            # Complementary (180° ± 30°)
            if 150 < diff < 210:
                harmony = 1.0 - abs(diff - 180) / 30
                best_harmony = max(best_harmony, harmony)

            # Analogous (0-60°)
            elif diff < 60:
                harmony = 1.0 - diff / 60
                best_harmony = max(best_harmony, harmony * 0.8)  # Slightly lower score

            # Triadic (120° ± 20°)
            elif 100 < diff < 140:
                harmony = 1.0 - abs(diff - 120) / 20
                best_harmony = max(best_harmony, harmony * 0.9)

    return best_harmony
```

---

## Global Color Grading for Collage Cohesion

**Problem:** Even with good local matches, collages can feel disjointed due to different white balance, exposure, saturation across photos.

**Solution:** Apply global color grading pass.

### Method 1: Histogram Matching

```python
def match_histogram_LAB(source_image, target_palette):
    """
    Adjust source image to match target color distribution.

    Uses cumulative histogram matching in LAB space.
    """
    # Convert source to LAB
    source_LAB = rgb_to_lab(source_image)

    # Extract LAB channels
    L, a, b = cv2.split(source_LAB)

    # Compute CDFs
    source_L_cdf = compute_cdf(L)
    source_a_cdf = compute_cdf(a)
    source_b_cdf = compute_cdf(b)

    # Target CDFs (from target palette)
    target_L_cdf = palette_to_cdf(target_palette, channel='L')
    target_a_cdf = palette_to_cdf(target_palette, channel='a')
    target_b_cdf = palette_to_cdf(target_palette, channel='b')

    # Match histograms
    L_matched = match_cdf(L, source_L_cdf, target_L_cdf)
    a_matched = match_cdf(a, source_a_cdf, target_a_cdf)
    b_matched = match_cdf(b, source_b_cdf, target_b_cdf)

    # Merge and convert back to RGB
    matched_LAB = cv2.merge([L_matched, a_matched, b_matched])
    matched_RGB = lab_to_rgb(matched_LAB)

    return matched_RGB
```

### Method 2: Affine Color Transform

Using optimal transport, find affine transform T(x) = Mx + b that maps source palette to target:

```python
def compute_affine_color_transform(source_palette, target_palette):
    """
    Find affine transform in LAB space using Wasserstein regression.
    """
    # Extract colors and weights
    source_colors = np.array([c for c, w in source_palette])  # (N, 3)
    target_colors = np.array([c for c, w in target_palette])  # (M, 3)
    source_weights = np.array([w for c, w in source_palette])
    target_weights = np.array([w for c, w in target_palette])

    # Compute transport plan via Sinkhorn
    gamma = sinkhorn_transport_plan(source_palette, target_palette)

    # Compute centroids
    source_centroid = np.average(source_colors, weights=source_weights, axis=0)
    target_centroid = np.average(target_colors, weights=target_weights, axis=0)

    # Center data
    X = source_colors - source_centroid  # (N, 3)
    Y = target_colors - target_centroid  # (M, 3)

    # Weighted covariance
    C = Y.T @ gamma @ X  # (3, 3)

    # Solve for M: M = C (Σᵢⱼ γᵢⱼ xᵢ xᵢᵀ)⁻¹
    X_cov = X.T @ np.diag(source_weights) @ X  # (3, 3)
    M = C @ np.linalg.inv(X_cov)

    # Solve for b
    b = target_centroid - M @ source_centroid

    return M, b


def apply_affine_color_transform(image, M, b):
    """Apply affine transform to all pixels in LAB space."""
    # Convert to LAB
    image_LAB = rgb_to_lab(image)
    h, w, _ = image_LAB.shape
    pixels = image_LAB.reshape(-1, 3)  # (H*W, 3)

    # Apply transform
    transformed = (M @ pixels.T).T + b  # (H*W, 3)

    # Clip to valid LAB range
    transformed[:, 0] = np.clip(transformed[:, 0], 0, 100)      # L
    transformed[:, 1] = np.clip(transformed[:, 1], -128, 127)   # a
    transformed[:, 2] = np.clip(transformed[:, 2], -128, 127)   # b

    # Reshape and convert back
    transformed_LAB = transformed.reshape(h, w, 3)
    transformed_RGB = lab_to_rgb(transformed_LAB)

    return transformed_RGB
```

**Regularization (Preserve Local Structure):**

Add penalty to keep M close to identity:
```
minimize:   W₂(T#μ, ν)² + λ ‖M - I‖²_F
```

This prevents extreme color shifts that destroy local structure.

---

## Complete Example: Collage Assembly with Color Harmony

```python
def assemble_collage_with_color_harmony(
    photo_database,
    seed_photo_id,
    target_size=(10, 10),
    diversity_lambda=0.7,
    temperature_pattern='alternating'  # 'alternating', 'wave', 'neutral-accent'
):
    """
    Complete collage assembly with advanced color harmony.
    """
    # 1. Extract global target palette from seed
    seed_palette = photo_database.get_palette(seed_photo_id)
    global_palette = seed_palette.copy()

    # 2. Select photos using MMR for diversity
    all_photos = photo_database.get_all_photos()

    # Filter by basic compatibility
    compatible = []
    for photo_id, palette in all_photos:
        if photo_id == seed_photo_id:
            continue

        compat, _ = palette_compatibility(seed_palette, palette)
        if compat > 0.4:
            compatible.append((photo_id, palette, compat))

    # Select using MMR
    n_photos = target_size[0] * target_size[1] - 1
    selected = select_photos_with_mmr(
        compatible,
        global_palette,
        k=n_photos,
        lambda_param=diversity_lambda
    )

    # 3. Arrange according to temperature pattern
    all_photos_with_palettes = [(seed_photo_id, seed_palette)] + [
        (pid, photo_database.get_palette(pid)) for pid in selected
    ]

    if temperature_pattern == 'alternating':
        ordered = arrange_warm_cool_alternation(all_photos_with_palettes)
    elif temperature_pattern == 'wave':
        ordered = temperature_wave_pattern(all_photos_with_palettes, wave_length=5)
    elif temperature_pattern == 'neutral-accent':
        ordered = neutral_with_accents_pattern(all_photos_with_palettes, accent_ratio=0.15)
    elif temperature_pattern == 'hue-sorted':
        ordered = sort_photos_by_hue(all_photos_with_palettes)
    else:
        ordered = [pid for pid, _ in all_photos_with_palettes]

    # 4. Place in grid
    canvas = Canvas(target_size)
    for idx, photo_id in enumerate(ordered):
        row = idx // target_size[1]
        col = idx % target_size[1]
        canvas.place_photo(photo_id, position=(row, col))

    # 5. Global color grading pass
    global_palette = aggregate_palettes([
        photo_database.get_palette(pid) for pid in ordered
    ])

    for photo_id in ordered:
        image = photo_database.get_image(photo_id)
        palette = photo_database.get_palette(photo_id)

        M, b = compute_affine_color_transform(palette, global_palette)
        graded = apply_affine_color_transform(image, M, b)
        blended = 0.7 * image + 0.3 * graded  # 30% correction

        canvas.update_photo(photo_id, blended)

    # 6. Refine boundaries (Poisson blending)
    canvas.refine_boundaries()

    return canvas.render()
```
