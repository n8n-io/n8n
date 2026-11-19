# Optimal Transport for Color Matching

## Earth-Mover Distance (Wasserstein Metric)

### The Palette Matching Problem

Given two photos with color distributions μ and ν, how "different" are they perceptually?

**Naïve Approach:** Compare dominant colors pairwise → **WRONG**
- Ignores color abundance (weight)
- Arbitrary pairing
- Doesn't capture overall distribution shift

**Correct Approach:** Earth-Mover Distance (EMD) / Wasserstein Metric

### Intuition

Imagine color histograms as piles of dirt. How much work (distance × amount) to transform one pile into the other?

### Mathematical Formulation

The **2-Wasserstein distance** between distributions μ and ν is:
```
W₂(μ, ν)² = inf{γ ∈ Π(μ,ν)} ∫∫ ‖x - y‖² dγ(x,y)
```

Where:
- Π(μ,ν): Set of all joint probability measures with marginals μ, ν
- γ: Transport plan (how much mass to move from color x to color y)
- ‖x - y‖²: Squared distance in LAB space (or CIEDE2000)

### Discrete Form (for implementation)

Photos represented as color palettes:
```
μ = {(c₁, w₁), (c₂, w₂), ..., (cₙ, wₙ)}  where Σwᵢ = 1
ν = {(d₁, v₁), (d₂, v₂), ..., (dₘ, vₘ)}  where Σvⱼ = 1
```

EMD becomes a linear programming problem:
```
minimize:   Σᵢⱼ Cost(cᵢ, dⱼ) · γᵢⱼ
subject to: Σⱼ γᵢⱼ = wᵢ  ∀i    (row sums = source weights)
            Σᵢ γᵢⱼ = vⱼ  ∀j    (column sums = target weights)
            γᵢⱼ ≥ 0
```

Where Cost(cᵢ, dⱼ) = CIEDE2000(cᵢ, dⱼ)² (squared perceptual distance).

**Problem:** O(N²M) variables for general LP solvers → expensive!

---

## Sinkhorn Algorithm: Fast Entropic EMD

### Entropic Regularization

Add entropy term to smooth the transport plan:
```
minimize:   Σᵢⱼ Cost(cᵢ, dⱼ) · γᵢⱼ + ε · H(γ)
```

Where H(γ) = -Σᵢⱼ γᵢⱼ log(γᵢⱼ) is entropy.

**Effect:** As ε → 0, recovers exact EMD. For ε > 0, transport plan is "spread out" but computation is much faster.

### Sinkhorn's Algorithm

```python
def sinkhorn_emd(palette1, palette2, epsilon=0.1, max_iters=100):
    """
    Compute approximate EMD using Sinkhorn algorithm.

    Args:
        palette1: List of (color, weight) tuples in LAB space
        palette2: List of (color, weight) tuples in LAB space
        epsilon: Entropic regularization parameter (smaller = more accurate)
        max_iters: Maximum iterations

    Returns:
        float: Approximate earth-mover distance
    """
    N = len(palette1)
    M = len(palette2)

    # Extract colors and weights
    colors1 = np.array([c for c, w in palette1])
    colors2 = np.array([c for c, w in palette2])
    a = np.array([w for c, w in palette1])
    b = np.array([w for c, w in palette2])

    # Compute cost matrix (CIEDE2000 distances squared)
    C = np.zeros((N, M))
    for i in range(N):
        for j in range(M):
            C[i, j] = ciede2000_squared(colors1[i], colors2[j])

    # Kernel matrix K = exp(-C / ε)
    K = np.exp(-C / epsilon)

    # Sinkhorn iterations
    u = np.ones(N)
    v = np.ones(M)

    for iteration in range(max_iters):
        u_prev = u.copy()
        u = a / (K @ v)
        v = b / (K.T @ u)

        # Check convergence
        if np.max(np.abs(u - u_prev)) < 1e-6:
            break

    # Optimal transport plan
    gamma = np.diag(u) @ K @ np.diag(v)

    # Compute EMD
    emd = np.sum(gamma * C)

    return np.sqrt(emd)  # Return distance, not squared distance
```

**Convergence:** Exponentially fast, typically 10-50 iterations.

**Complexity:** O(NM) per iteration (just matrix-vector products).

### Choosing ε

- ε = 0.01: Nearly exact EMD, slower convergence (50-100 iterations)
- ε = 0.1: Good approximation, fast (10-20 iterations)
- ε = 1.0: Very approximate, instant (&lt;5 iterations)

**For collage assembly:** ε = 0.1 is recommended balance.

---

## Multiscale Sliced Wasserstein Distance (2024-2025 Cutting Edge)

**New Research (ECCV 2024):** Multiscale Sliced Wasserstein Distance (MS-SWD) offers:
- **Faster computation:** O(M log M) vs O(M^2.5) for standard Wasserstein
- **Handles misalignment:** Compares patch distributions, not co-located pixels
- **Metric properties:** Satisfies non-negativity, symmetry, triangle inequality
- **Better than CIEDE2000 for non-aligned images**

### How It Works

1. **Slicing:** Project high-dimensional color distributions onto 1D lines
2. **1D Wasserstein:** Compute EMD in 1D (cheap: just sort and compare)
3. **Integration:** Average over many random projection directions
4. **Multiscale:** Repeat at different image pyramid levels

### Algorithm

```python
def multiscale_sliced_wasserstein(palette1, palette2, n_projections=100, n_scales=3):
    """
    Compute MS-SWD between two color palettes.

    Based on: "Multiscale Sliced Wasserstein Distances as Perceptual
    Color Difference Measures" (ECCV 2024)

    Args:
        palette1: [(color_LAB, weight), ...] for photo 1
        palette2: [(color_LAB, weight), ...] for photo 2
        n_projections: Number of random 1D projections
        n_scales: Number of pyramid scales

    Returns:
        float: MS-SWD distance
    """
    total_distance = 0.0

    for scale in range(n_scales):
        # At each scale, compute sliced Wasserstein
        scale_distance = 0.0

        for _ in range(n_projections):
            # Random unit vector in 3D LAB space
            theta = np.random.randn(3)
            theta /= np.linalg.norm(theta)

            # Project colors onto this direction
            proj1 = [(np.dot(c, theta), w) for c, w in palette1]
            proj2 = [(np.dot(c, theta), w) for c, w in palette2]

            # Sort by projection value
            proj1.sort(key=lambda x: x[0])
            proj2.sort(key=lambda x: x[0])

            # 1D Wasserstein = area between CDFs
            distance_1d = earth_movers_distance_1d(proj1, proj2)
            scale_distance += distance_1d

        scale_distance /= n_projections
        total_distance += scale_distance * (2 ** (-scale))  # Weight by scale

    return total_distance
```

### When to Use MS-SWD vs Sinkhorn

- **MS-SWD:** When photos might have same colors but different spatial distributions
- **Sinkhorn EMD:** When you care only about color histogram match (ignores spatial structure)
- **CIEDE2000 + Sinkhorn:** Best for palette-to-palette comparison in collage assembly

---

## Sinkhorn Algorithm Tuning

```python
# For collage assembly (real-time):
epsilon = 0.1  # Good approximation, fast
max_iters = 50  # Typically converges in 10-20

# For final color grading (offline):
epsilon = 0.01  # More accurate
max_iters = 200  # Allow more iterations

# For quick preview:
epsilon = 1.0   # Very approximate but instant
max_iters = 10
```

---

## Approximate EMD for Large Palettes

```python
def fast_palette_distance(palette1, palette2):
    """
    O(N log N) approximate EMD using dominant colors only.

    For real-time preview, use top 3 colors instead of full palette.
    """
    # Keep only top 3 colors by weight
    top1 = sorted(palette1, key=lambda x: x[1], reverse=True)[:3]
    top2 = sorted(palette2, key=lambda x: x[1], reverse=True)[:3]

    # Renormalize weights
    total1 = sum(w for c, w in top1)
    total2 = sum(w for c, w in top2)
    top1 = [(c, w/total1) for c, w in top1]
    top2 = [(c, w/total2) for c, w in top2]

    # Compute EMD on small palettes (fast)
    return sinkhorn_emd(top1, top2, epsilon=0.5, max_iters=20)
```

---

## Adaptive Epsilon for Sinkhorn

```python
def adaptive_sinkhorn(palette1, palette2):
    """Start with high epsilon for rough estimate, refine if needed."""
    # Quick estimate
    rough_emd = sinkhorn_emd(palette1, palette2, epsilon=1.0, max_iters=10)

    if rough_emd < 20:  # Very similar
        return rough_emd
    elif rough_emd > 80:  # Very different
        return rough_emd
    else:  # Uncertain, refine
        return sinkhorn_emd(palette1, palette2, epsilon=0.05, max_iters=100)
```

---

## References

- Peyré, G., & Cuturi, M. (2019). "Computational Optimal Transport." Foundations and Trends in Machine Learning.
- "Multiscale Sliced Wasserstein Distances as Perceptual Color Difference Measures" (ECCV 2024)
