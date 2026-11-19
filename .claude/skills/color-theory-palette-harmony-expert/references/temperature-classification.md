# Warm/Cool Temperature Classification

## Problem

Given a photo, classify its dominant temperature as warm, cool, or neutral.

---

## LCH Hue Angle Approach

```python
def classify_temperature(palette_LCH):
    """
    Classify palette as warm, cool, or neutral.

    Args:
        palette_LCH: List of (L, C, H, weight) tuples

    Returns:
        str: "warm", "cool", or "neutral"
        float: Temperature score (-1 = cool, +1 = warm)
    """
    warm_score = 0.0
    cool_score = 0.0

    for L, C, H, weight in palette_LCH:
        # Chroma weighting: More saturated colors contribute more
        chroma_weight = C / 100.0
        effective_weight = weight * chroma_weight

        # Warm hues: Red (0-30°), Orange (30-60°), Yellow (60-90°)
        if 0 <= H < 90:
            warm_score += effective_weight

        # Cool hues: Green (120-180°), Cyan (180-210°), Blue (210-270°)
        elif 120 <= H < 270:
            cool_score += effective_weight

        # Transitional: Yellow-Green (90-120°), Purple (270-330°)
        # Count as half warm, half cool
        elif 90 <= H < 120:
            warm_score += effective_weight * 0.3
            cool_score += effective_weight * 0.7
        elif 270 <= H < 330:
            warm_score += effective_weight * 0.5
            cool_score += effective_weight * 0.5

        # Magenta (330-360°): Warm
        else:
            warm_score += effective_weight

    # Normalize
    total = warm_score + cool_score
    if total < 0.1:
        return "neutral", 0.0

    temperature = (warm_score - cool_score) / total

    if temperature > 0.3:
        return "warm", temperature
    elif temperature < -0.3:
        return "cool", temperature
    else:
        return "neutral", temperature
```

---

## LAB b-axis Approach

Use LAB b-axis as temperature proxy (more robust for low-chroma colors):

```
b > 20: Warm (yellow-biased)
b < -20: Cool (blue-biased)
-20 ≤ b ≤ 20: Neutral
```

**Weighted Temperature Score:**

```python
def temperature_score_LAB(palette_LAB):
    """
    Compute temperature using LAB b-axis.

    More robust than hue-based for low-chroma colors.
    """
    total_weight = sum(w for c, w in palette_LAB)
    weighted_b = sum(c[2] * w for c, w in palette_LAB) / total_weight

    # Normalize to [-1, 1]
    # Typical b range: [-128, 128]
    return np.clip(weighted_b / 64, -1.0, 1.0)
```

---

## Hue-Sorted Photo Sequences

**Goal:** Arrange photos in hue order to create rainbow gradients or smooth color transitions.

### Algorithm

```python
def sort_photos_by_hue(photos_with_palettes):
    """
    Sort photos by dominant hue for rainbow effect.

    Args:
        photos_with_palettes: [(photo_id, palette_LCH), ...]

    Returns:
        List of photo_ids in hue-sorted order
    """
    def dominant_hue(palette_LCH):
        # Weight by chroma * weight (ignore low-saturation colors)
        weighted_hues = []
        for L, C, H, weight in palette_LCH:
            if C > 10:  # Ignore near-neutral colors
                weighted_hues.append((H, C * weight))

        if not weighted_hues:
            return 0.0  # Default for neutral images

        # Circular mean of hue (handles 359° + 1° = 0° correctly)
        sin_sum = sum(w * np.sin(np.radians(h)) for h, w in weighted_hues)
        cos_sum = sum(w * np.cos(np.radians(h)) for h, w in weighted_hues)

        mean_hue = np.degrees(np.arctan2(sin_sum, cos_sum)) % 360
        return mean_hue

    # Compute dominant hue for each photo
    photo_hues = [(photo_id, dominant_hue(palette))
                  for photo_id, palette in photos_with_palettes]

    # Sort by hue
    photo_hues.sort(key=lambda x: x[1])

    return [photo_id for photo_id, hue in photo_hues]
```

### Circular Hue Handling

Hue is circular (0° = 360° = red). Sorting naïvely by angle breaks at the red boundary.

**Solution:** Choose rotation that minimizes total angular difference:

```python
def optimize_hue_rotation(hues):
    """
    Find rotation that minimizes sum of adjacent hue differences.

    This ensures smooth transitions across the red boundary.
    """
    best_rotation = 0
    min_total_diff = float('inf')

    # Try 36 rotations (every 10 degrees)
    for rotation in range(0, 360, 10):
        rotated_hues = [(h + rotation) % 360 for h in hues]
        rotated_hues.sort()

        # Compute total adjacent difference
        total_diff = sum(abs(rotated_hues[i+1] - rotated_hues[i])
                        for i in range(len(rotated_hues) - 1))

        # Add wrap-around difference
        total_diff += min(
            abs(rotated_hues[0] - rotated_hues[-1]),
            360 - abs(rotated_hues[0] - rotated_hues[-1])
        )

        if total_diff < min_total_diff:
            min_total_diff = total_diff
            best_rotation = rotation

    # Apply best rotation
    return [(h + best_rotation) % 360 for h in hues]
```

---

## Warm/Cool Alternation Pattern

**Design Pattern:** Alternate warm and cool photos for visual rhythm and contrast.

### Algorithm

```python
def arrange_warm_cool_alternation(photos_with_palettes):
    """
    Arrange photos in alternating warm/cool pattern.

    Creates visual rhythm and prevents color monotony.

    Args:
        photos_with_palettes: [(photo_id, palette_LAB), ...]

    Returns:
        List of photo_ids in alternating order
    """
    # Classify each photo
    photos_classified = []
    for photo_id, palette in photos_with_palettes:
        temp_type, temp_score = classify_temperature(palette)
        photos_classified.append((photo_id, temp_type, temp_score))

    # Separate into warm, cool, neutral
    warm_photos = [(pid, score) for pid, t, score in photos_classified if t == "warm"]
    cool_photos = [(pid, score) for pid, t, score in photos_classified if t == "cool"]
    neutral_photos = [(pid, score) for pid, t, score in photos_classified if t == "neutral"]

    # Sort by temperature intensity (most extreme first)
    warm_photos.sort(key=lambda x: -x[1])  # Descending
    cool_photos.sort(key=lambda x: x[1])   # Ascending (most negative first)

    # Alternate warm and cool
    result = []
    while warm_photos or cool_photos:
        if warm_photos:
            result.append(warm_photos.pop(0)[0])
        if cool_photos:
            result.append(cool_photos.pop(0)[0])

    # Intersperse neutrals evenly
    if neutral_photos:
        step = len(result) / (len(neutral_photos) + 1)
        for i, (pid, _) in enumerate(neutral_photos):
            insert_pos = int((i + 1) * step)
            result.insert(insert_pos, pid)

    return result
```

### Gradual Temperature Progression

Instead of strict alternation, create smooth warm → cool → warm waves:

```python
def temperature_wave_pattern(photos, wave_length=5):
    """
    Arrange photos in sinusoidal warm/cool pattern.

    Args:
        photos: [(photo_id, temperature_score), ...]
        wave_length: Period of temperature oscillation

    Returns:
        List of photo_ids
    """
    # Sort by temperature
    photos.sort(key=lambda x: x[1])

    # Assign target temperature based on sine wave
    n = len(photos)
    target_temps = [np.sin(2 * np.pi * i / wave_length) for i in range(n)]

    # Match photos to target temperatures (greedy assignment)
    result = []
    used = set()

    for target in target_temps:
        # Find unused photo closest to target
        best_photo = None
        best_diff = float('inf')

        for photo_id, temp_score in photos:
            if photo_id not in used:
                diff = abs(temp_score - target)
                if diff < best_diff:
                    best_diff = diff
                    best_photo = photo_id

        if best_photo:
            result.append(best_photo)
            used.add(best_photo)

    return result
```

---

## Troubleshooting

### Issue: Warm/cool classification fails for sunset photos

**Solution:** Use both hue angle and LAB b-axis, combine:
```python
temp_score = 0.5 * hue_based_temp(palette) + 0.5 * b_axis_temp(palette)
```

### Issue: Hue-sorted sequence has jarring transitions

**Solution:** Apply hue rotation optimization to minimize angular jumps.
