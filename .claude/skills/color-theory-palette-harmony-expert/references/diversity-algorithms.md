# Diversity Algorithms: Preventing Color Monotony

## Problem

Without diversity constraints, optimization may select all similar colors (e.g., all blue skies).

**Goal:** Encourage variety in selected photo palettes while maintaining harmony.

---

## Method 1: Maximal Marginal Relevance (MMR)

**Concept:** Select photos that are both relevant (harmonious) and diverse (different from already selected).

### Formula

```
Score(photo_i) = λ · Harmony(photo_i, global_palette)
                 - (1 - λ) · max_j∈Selected Similarity(photo_i, photo_j)
```

Where:
- λ ∈ [0, 1]: Diversity parameter (0.7 = 70% harmony, 30% diversity)
- Harmony: How well photo_i fits global palette (negative EMD)
- Similarity: Max similarity to any already-selected photo

### Greedy Algorithm

```python
def select_photos_with_mmr(candidate_photos, target_palette, k, lambda_param=0.7):
    """
    Select k photos using Maximal Marginal Relevance.

    Balances harmony with target palette and diversity among selected photos.

    Args:
        candidate_photos: [(photo_id, palette_LAB), ...]
        target_palette: Global target palette
        k: Number of photos to select
        lambda_param: 0.7 = prefer harmony, 0.3 = prefer diversity

    Returns:
        List of k selected photo_ids
    """
    selected = []
    remaining = list(candidate_photos)

    # Select first photo: highest harmony
    best_photo = max(remaining,
                     key=lambda x: -sinkhorn_emd(x[1], target_palette))
    selected.append(best_photo)
    remaining.remove(best_photo)

    # Select remaining k-1 photos
    for _ in range(k - 1):
        best_score = -float('inf')
        best_photo = None

        for photo_id, palette in remaining:
            # Harmony term (negative EMD = high harmony)
            harmony = -sinkhorn_emd(palette, target_palette)

            # Diversity term (max similarity to any selected photo)
            max_similarity = 0
            for selected_id, selected_palette in selected:
                # Similarity = negative EMD (closer = more similar)
                similarity = -sinkhorn_emd(palette, selected_palette)
                max_similarity = max(max_similarity, similarity)

            # MMR score
            mmr_score = lambda_param * harmony - (1 - lambda_param) * max_similarity

            if mmr_score > best_score:
                best_score = mmr_score
                best_photo = (photo_id, palette)

        if best_photo:
            selected.append(best_photo)
            remaining.remove(best_photo)

    return [photo_id for photo_id, _ in selected]
```

### Tuning λ

- λ = 1.0: Pure harmony, no diversity (may select all blues)
- λ = 0.7: Balanced (recommended for collages)
- λ = 0.5: Equal harmony and diversity
- λ = 0.3: Heavy diversity (may sacrifice harmony)
- λ = 0.0: Pure diversity (maximally different palettes)

---

## Method 2: Determinantal Point Processes (DPPs)

**Concept:** Probabilistic model that encodes both quality and diversity via a kernel matrix.

### Kernel Matrix

```
K[i, j] = Quality(i) · Quality(j) · Similarity(i, j)
```

Where:
- Quality(i): How good photo i is (aesthetic score, harmony with target)
- Similarity(i, j): How similar photos i and j are (negative EMD)

### Key Property

DPP naturally repels similar items. Probability of selecting a set S:
```
P(S) ∝ det(K_S)
```

Where K_S is the submatrix of K indexed by S.

**Intuition:** Determinant is large when rows/columns are linearly independent → diverse sets favored.

### Sampling Algorithm

```python
def sample_diverse_subset_dpp(photos_with_palettes, target_palette, k):
    """
    Sample k photos using Determinantal Point Process.

    Automatically balances quality and diversity.

    Args:
        photos_with_palettes: [(photo_id, palette, aesthetic_score), ...]
        target_palette: Global palette to match
        k: Number of photos to sample

    Returns:
        List of k sampled photo_ids
    """
    n = len(photos_with_palettes)

    # Compute quality scores
    qualities = np.zeros(n)
    for i, (pid, palette, aesthetic) in enumerate(photos_with_palettes):
        harmony = -sinkhorn_emd(palette, target_palette)  # Higher = better
        qualities[i] = aesthetic * 0.5 + harmony * 0.5  # Combine aesthetic & harmony

    # Normalize qualities to [0, 1]
    qualities = (qualities - qualities.min()) / (qualities.max() - qualities.min())

    # Compute similarity matrix (negative EMD)
    S = np.zeros((n, n))
    for i in range(n):
        for j in range(i, n):
            if i == j:
                S[i, j] = 1.0
            else:
                emd = sinkhorn_emd(photos_with_palettes[i][1],
                                   photos_with_palettes[j][1])
                similarity = np.exp(-emd / 50)  # Convert distance to similarity
                S[i, j] = S[j, i] = similarity

    # Kernel matrix K = Q · S · Q (element-wise)
    Q = np.diag(qualities)
    K = Q @ S @ Q

    # Sample k items using DPP
    selected_indices = dpp_sample(K, k)

    return [photos_with_palettes[i][0] for i in selected_indices]


def dpp_sample(K, k):
    """
    Sample k items from DPP with kernel K.

    Uses eigenvalue decomposition method.
    """
    # Eigenvalue decomposition
    eigenvalues, eigenvectors = np.linalg.eigh(K)

    # Sample elementary DPP
    selected = []
    for i in range(len(eigenvalues) - 1, -1, -1):
        if len(selected) >= k:
            break
        # Include eigenvalue with probability proportional to its magnitude
        if np.random.rand() < eigenvalues[i] / (1 + eigenvalues[i]):
            selected.append(i)

    # Project to original space
    items = np.random.choice(len(K), k, replace=False)
    return items
```

### Advantages over MMR

- Probabilistic: Can sample multiple diverse sets
- Theoretically principled: Negative correlation built into model
- Handles quality and diversity jointly

### Disadvantages

- More complex to implement
- Requires eigenvalue decomposition (O(n³))
- Less intuitive to tune

**Recommendation:** Use MMR for simplicity and control, DPPs for elegant probabilistic diversity.

---

## Method 3: Submodular Maximization

**Concept:** Define a submodular function (diminishing returns property) and greedily maximize it.

### Submodular Function

```
F(S) = Harmony(S, target) + Diversity(S)
```

Where:
- Harmony(S, target): How well set S matches target palette
- Diversity(S): Spread of colors in S (entropy, determinant, etc.)

**Key Property:** Greedy algorithm achieves (1 - 1/e) ≈ 63% of optimal for submodular functions.

### Example

```python
def submodular_photo_selection(photos, target_palette, k):
    """
    Select k photos via submodular maximization.

    Objective: F(S) = α·Harmony(S) + β·Diversity(S)
    """
    selected = []

    def marginal_gain(photo, selected):
        """Gain from adding photo to selected set."""
        # Harmony term: How much closer to target?
        current_palette = aggregate_palettes([p[1] for p in selected])
        new_palette = aggregate_palettes([p[1] for p in selected + [photo]])

        harmony_gain = (sinkhorn_emd(current_palette, target_palette)
                       - sinkhorn_emd(new_palette, target_palette))

        # Diversity term: How different from selected?
        if not selected:
            diversity_gain = 1.0  # First photo always diverse
        else:
            diversity_gain = min(
                sinkhorn_emd(photo[1], s[1]) for s in selected
            ) / 50  # Normalize

        return 0.5 * harmony_gain + 0.5 * diversity_gain

    # Greedy selection
    remaining = list(photos)
    for _ in range(k):
        best_photo = max(remaining, key=lambda p: marginal_gain(p, selected))
        selected.append(best_photo)
        remaining.remove(best_photo)

    return [photo_id for photo_id, _ in selected]
```

---

## Comparison Summary

| Method | Complexity | Control | Use Case |
|--------|-----------|---------|----------|
| **MMR** | O(k·n) | λ parameter | Real-time, tunable |
| **DPP** | O(n³) | Kernel design | Sampling multiple sets |
| **Submodular** | O(k·n) | Function weights | Theoretical guarantees |

**Recommendation:** Start with MMR (λ=0.7) for most collage applications.

---

## Troubleshooting

### Issue: Collage feels monotonous despite diversity penalty

**Solution:** Increase MMR diversity parameter (lower λ from 0.7 to 0.5) or use DPP sampling.
