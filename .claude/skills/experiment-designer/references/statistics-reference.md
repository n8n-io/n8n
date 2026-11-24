# Statistics Reference for Product Managers

## p-value

The p-value is the probability of observing data at least as extreme as yours if there were no true effect.

- Small p-value means data is less consistent with "no effect".
- It does not tell you the probability that the variant is best.

## Confidence Interval (CI)

A CI gives a plausible range for the true effect size.

- Narrow interval: more precise estimate.
- Wide interval: uncertain estimate.
- If CI includes zero (or no-effect), directional confidence is weak.

## Minimum Detectable Effect (MDE)

The smallest effect worth detecting.

- Set MDE by business value threshold, not wishful optimism.
- Smaller MDE requires larger sample size.

## Statistical Power

Power is the probability of detecting a true effect of at least MDE.

- Common target: 80% (0.8)
- Higher power increases sample requirements.

## Type I and Type II Errors

- Type I (false positive): claim effect when none exists (controlled by alpha).
- Type II (false negative): miss a real effect (controlled by power).

## Practical Significance

An effect can be statistically significant but too small to matter.

Always ask:
- Does the effect clear implementation cost?
- Does it move strategic KPIs materially?

## Power Analysis Inputs

For conversion experiments (two proportions):
- Baseline conversion rate
- MDE (absolute points or relative uplift)
- Alpha (e.g., 0.05)
- Power (e.g., 0.8)

Output:
- Required sample size per variant
- Total sample size
- Approximate runtime based on traffic volume
