"""
A/B testing module for App Store Optimization.
Plans and tracks A/B tests for metadata and visual assets.
"""

from typing import Dict, List, Any, Optional
import math


class ABTestPlanner:
    """Plans and tracks A/B tests for ASO elements."""

    # Minimum detectable effect sizes (conservative estimates)
    MIN_EFFECT_SIZES = {
        'icon': 0.10,  # 10% conversion improvement
        'screenshot': 0.08,  # 8% conversion improvement
        'title': 0.05,  # 5% conversion improvement
        'description': 0.03  # 3% conversion improvement
    }

    # Statistical confidence levels
    CONFIDENCE_LEVELS = {
        'high': 0.95,  # 95% confidence
        'standard': 0.90,  # 90% confidence
        'exploratory': 0.80  # 80% confidence
    }

    def __init__(self):
        """Initialize A/B test planner."""
        self.active_tests = []

    def design_test(
        self,
        test_type: str,
        variant_a: Dict[str, Any],
        variant_b: Dict[str, Any],
        hypothesis: str,
        success_metric: str = 'conversion_rate'
    ) -> Dict[str, Any]:
        """
        Design an A/B test with hypothesis and variables.

        Args:
            test_type: Type of test ('icon', 'screenshot', 'title', 'description')
            variant_a: Control variant details
            variant_b: Test variant details
            hypothesis: Expected outcome hypothesis
            success_metric: Metric to optimize

        Returns:
            Test design with configuration
        """
        test_design = {
            'test_id': self._generate_test_id(test_type),
            'test_type': test_type,
            'hypothesis': hypothesis,
            'variants': {
                'a': {
                    'name': 'Control',
                    'details': variant_a,
                    'traffic_split': 0.5
                },
                'b': {
                    'name': 'Variation',
                    'details': variant_b,
                    'traffic_split': 0.5
                }
            },
            'success_metric': success_metric,
            'secondary_metrics': self._get_secondary_metrics(test_type),
            'minimum_effect_size': self.MIN_EFFECT_SIZES.get(test_type, 0.05),
            'recommended_confidence': 'standard',
            'best_practices': self._get_test_best_practices(test_type)
        }

        self.active_tests.append(test_design)
        return test_design

    def calculate_sample_size(
        self,
        baseline_conversion: float,
        minimum_detectable_effect: float,
        confidence_level: str = 'standard',
        power: float = 0.80
    ) -> Dict[str, Any]:
        """
        Calculate required sample size for statistical significance.

        Args:
            baseline_conversion: Current conversion rate (0-1)
            minimum_detectable_effect: Minimum effect size to detect (0-1)
            confidence_level: 'high', 'standard', or 'exploratory'
            power: Statistical power (typically 0.80 or 0.90)

        Returns:
            Sample size calculation with duration estimates
        """
        alpha = 1 - self.CONFIDENCE_LEVELS[confidence_level]
        beta = 1 - power

        # Expected conversion for variant B
        expected_conversion_b = baseline_conversion * (1 + minimum_detectable_effect)

        # Z-scores for alpha and beta
        z_alpha = self._get_z_score(1 - alpha / 2)  # Two-tailed test
        z_beta = self._get_z_score(power)

        # Pooled standard deviation
        p_pooled = (baseline_conversion + expected_conversion_b) / 2
        sd_pooled = math.sqrt(2 * p_pooled * (1 - p_pooled))

        # Sample size per variant
        n_per_variant = math.ceil(
            ((z_alpha + z_beta) ** 2 * sd_pooled ** 2) /
            ((expected_conversion_b - baseline_conversion) ** 2)
        )

        total_sample_size = n_per_variant * 2

        # Estimate duration based on typical traffic
        duration_estimates = self._estimate_test_duration(
            total_sample_size,
            baseline_conversion
        )

        return {
            'sample_size_per_variant': n_per_variant,
            'total_sample_size': total_sample_size,
            'baseline_conversion': baseline_conversion,
            'expected_conversion_improvement': minimum_detectable_effect,
            'expected_conversion_b': expected_conversion_b,
            'confidence_level': confidence_level,
            'statistical_power': power,
            'duration_estimates': duration_estimates,
            'recommendations': self._generate_sample_size_recommendations(
                n_per_variant,
                duration_estimates
            )
        }

    def calculate_significance(
        self,
        variant_a_conversions: int,
        variant_a_visitors: int,
        variant_b_conversions: int,
        variant_b_visitors: int
    ) -> Dict[str, Any]:
        """
        Calculate statistical significance of test results.

        Args:
            variant_a_conversions: Conversions for control
            variant_a_visitors: Visitors for control
            variant_b_conversions: Conversions for variation
            variant_b_visitors: Visitors for variation

        Returns:
            Significance analysis with decision recommendation
        """
        # Calculate conversion rates
        rate_a = variant_a_conversions / variant_a_visitors if variant_a_visitors > 0 else 0
        rate_b = variant_b_conversions / variant_b_visitors if variant_b_visitors > 0 else 0

        # Calculate improvement
        if rate_a > 0:
            relative_improvement = (rate_b - rate_a) / rate_a
        else:
            relative_improvement = 0

        absolute_improvement = rate_b - rate_a

        # Calculate standard error
        se_a = math.sqrt(rate_a * (1 - rate_a) / variant_a_visitors) if variant_a_visitors > 0 else 0
        se_b = math.sqrt(rate_b * (1 - rate_b) / variant_b_visitors) if variant_b_visitors > 0 else 0
        se_diff = math.sqrt(se_a**2 + se_b**2)

        # Calculate z-score
        z_score = absolute_improvement / se_diff if se_diff > 0 else 0

        # Calculate p-value (two-tailed)
        p_value = 2 * (1 - self._standard_normal_cdf(abs(z_score)))

        # Determine significance
        is_significant_95 = p_value < 0.05
        is_significant_90 = p_value < 0.10

        # Generate decision
        decision = self._generate_test_decision(
            relative_improvement,
            is_significant_95,
            is_significant_90,
            variant_a_visitors + variant_b_visitors
        )

        return {
            'variant_a': {
                'conversions': variant_a_conversions,
                'visitors': variant_a_visitors,
                'conversion_rate': round(rate_a, 4)
            },
            'variant_b': {
                'conversions': variant_b_conversions,
                'visitors': variant_b_visitors,
                'conversion_rate': round(rate_b, 4)
            },
            'improvement': {
                'absolute': round(absolute_improvement, 4),
                'relative_percentage': round(relative_improvement * 100, 2)
            },
            'statistical_analysis': {
                'z_score': round(z_score, 3),
                'p_value': round(p_value, 4),
                'is_significant_95': is_significant_95,
                'is_significant_90': is_significant_90,
                'confidence_level': '95%' if is_significant_95 else ('90%' if is_significant_90 else 'Not significant')
            },
            'decision': decision
        }

    def track_test_results(
        self,
        test_id: str,
        results_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Track ongoing test results and provide recommendations.

        Args:
            test_id: Test identifier
            results_data: Current test results

        Returns:
            Test tracking report with next steps
        """
        # Find test
        test = next((t for t in self.active_tests if t['test_id'] == test_id), None)
        if not test:
            return {'error': f'Test {test_id} not found'}

        # Calculate significance
        significance = self.calculate_significance(
            results_data['variant_a_conversions'],
            results_data['variant_a_visitors'],
            results_data['variant_b_conversions'],
            results_data['variant_b_visitors']
        )

        # Calculate test progress
        total_visitors = results_data['variant_a_visitors'] + results_data['variant_b_visitors']
        required_sample = results_data.get('required_sample_size', 10000)
        progress_percentage = min((total_visitors / required_sample) * 100, 100)

        # Generate recommendations
        recommendations = self._generate_tracking_recommendations(
            significance,
            progress_percentage,
            test['test_type']
        )

        return {
            'test_id': test_id,
            'test_type': test['test_type'],
            'progress': {
                'total_visitors': total_visitors,
                'required_sample_size': required_sample,
                'progress_percentage': round(progress_percentage, 1),
                'is_complete': progress_percentage >= 100
            },
            'current_results': significance,
            'recommendations': recommendations,
            'next_steps': self._determine_next_steps(
                significance,
                progress_percentage
            )
        }

    def generate_test_report(
        self,
        test_id: str,
        final_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate final test report with insights and recommendations.

        Args:
            test_id: Test identifier
            final_results: Final test results

        Returns:
            Comprehensive test report
        """
        test = next((t for t in self.active_tests if t['test_id'] == test_id), None)
        if not test:
            return {'error': f'Test {test_id} not found'}

        significance = self.calculate_significance(
            final_results['variant_a_conversions'],
            final_results['variant_a_visitors'],
            final_results['variant_b_conversions'],
            final_results['variant_b_visitors']
        )

        # Generate insights
        insights = self._generate_test_insights(
            test,
            significance,
            final_results
        )

        # Implementation plan
        implementation_plan = self._create_implementation_plan(
            test,
            significance
        )

        return {
            'test_summary': {
                'test_id': test_id,
                'test_type': test['test_type'],
                'hypothesis': test['hypothesis'],
                'duration_days': final_results.get('duration_days', 'N/A')
            },
            'results': significance,
            'insights': insights,
            'implementation_plan': implementation_plan,
            'learnings': self._extract_learnings(test, significance)
        }

    def _generate_test_id(self, test_type: str) -> str:
        """Generate unique test ID."""
        import time
        timestamp = int(time.time())
        return f"{test_type}_{timestamp}"

    def _get_secondary_metrics(self, test_type: str) -> List[str]:
        """Get secondary metrics to track for test type."""
        metrics_map = {
            'icon': ['tap_through_rate', 'impression_count', 'brand_recall'],
            'screenshot': ['tap_through_rate', 'time_on_page', 'scroll_depth'],
            'title': ['impression_count', 'tap_through_rate', 'search_visibility'],
            'description': ['time_on_page', 'scroll_depth', 'tap_through_rate']
        }
        return metrics_map.get(test_type, ['tap_through_rate'])

    def _get_test_best_practices(self, test_type: str) -> List[str]:
        """Get best practices for specific test type."""
        practices_map = {
            'icon': [
                'Test only one element at a time (color vs. style vs. symbolism)',
                'Ensure icon is recognizable at small sizes (60x60px)',
                'Consider cultural context for global audience',
                'Test against top competitor icons'
            ],
            'screenshot': [
                'Test order of screenshots (users see first 2-3)',
                'Use captions to tell story',
                'Show key features and benefits',
                'Test with and without device frames'
            ],
            'title': [
                'Test keyword variations, not major rebrand',
                'Keep brand name consistent',
                'Ensure title fits within character limits',
                'Test on both search and browse contexts'
            ],
            'description': [
                'Test structure (bullet points vs. paragraphs)',
                'Test call-to-action placement',
                'Test feature vs. benefit focus',
                'Maintain keyword density'
            ]
        }
        return practices_map.get(test_type, ['Test one variable at a time'])

    def _estimate_test_duration(
        self,
        required_sample_size: int,
        baseline_conversion: float
    ) -> Dict[str, Any]:
        """Estimate test duration based on typical traffic levels."""
        # Assume different daily traffic scenarios
        traffic_scenarios = {
            'low': 100,      # 100 page views/day
            'medium': 1000,  # 1000 page views/day
            'high': 10000    # 10000 page views/day
        }

        estimates = {}
        for scenario, daily_views in traffic_scenarios.items():
            days = math.ceil(required_sample_size / daily_views)
            estimates[scenario] = {
                'daily_page_views': daily_views,
                'estimated_days': days,
                'estimated_weeks': round(days / 7, 1)
            }

        return estimates

    def _generate_sample_size_recommendations(
        self,
        sample_size: int,
        duration_estimates: Dict[str, Any]
    ) -> List[str]:
        """Generate recommendations based on sample size."""
        recommendations = []

        if sample_size > 50000:
            recommendations.append(
                "Large sample size required - consider testing smaller effect size or increasing traffic"
            )

        if duration_estimates['medium']['estimated_days'] > 30:
            recommendations.append(
                "Long test duration - consider higher minimum detectable effect or focus on high-impact changes"
            )

        if duration_estimates['low']['estimated_days'] > 60:
            recommendations.append(
                "Insufficient traffic for reliable testing - consider user acquisition or broader targeting"
            )

        if not recommendations:
            recommendations.append("Sample size and duration are reasonable for this test")

        return recommendations

    def _get_z_score(self, percentile: float) -> float:
        """Get z-score for given percentile (approximation)."""
        # Common z-scores
        z_scores = {
            0.80: 0.84,
            0.85: 1.04,
            0.90: 1.28,
            0.95: 1.645,
            0.975: 1.96,
            0.99: 2.33
        }
        return z_scores.get(percentile, 1.96)

    def _standard_normal_cdf(self, z: float) -> float:
        """Approximate standard normal cumulative distribution function."""
        # Using error function approximation
        t = 1.0 / (1.0 + 0.2316419 * abs(z))
        d = 0.3989423 * math.exp(-z * z / 2.0)
        p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))

        if z > 0:
            return 1.0 - p
        else:
            return p

    def _generate_test_decision(
        self,
        improvement: float,
        is_significant_95: bool,
        is_significant_90: bool,
        total_visitors: int
    ) -> Dict[str, Any]:
        """Generate test decision and recommendation."""
        if total_visitors < 1000:
            return {
                'decision': 'continue',
                'rationale': 'Insufficient data - continue test to reach minimum sample size',
                'action': 'Keep test running'
            }

        if is_significant_95:
            if improvement > 0:
                return {
                    'decision': 'implement_b',
                    'rationale': f'Variant B shows {improvement*100:.1f}% improvement with 95% confidence',
                    'action': 'Implement Variant B'
                }
            else:
                return {
                    'decision': 'keep_a',
                    'rationale': 'Variant A performs better with 95% confidence',
                    'action': 'Keep current version (A)'
                }

        elif is_significant_90:
            if improvement > 0:
                return {
                    'decision': 'implement_b_cautiously',
                    'rationale': f'Variant B shows {improvement*100:.1f}% improvement with 90% confidence',
                    'action': 'Consider implementing B, monitor closely'
                }
            else:
                return {
                    'decision': 'keep_a',
                    'rationale': 'Variant A performs better with 90% confidence',
                    'action': 'Keep current version (A)'
                }

        else:
            return {
                'decision': 'inconclusive',
                'rationale': 'No statistically significant difference detected',
                'action': 'Either keep A or test different hypothesis'
            }

    def _generate_tracking_recommendations(
        self,
        significance: Dict[str, Any],
        progress: float,
        test_type: str
    ) -> List[str]:
        """Generate recommendations for ongoing test."""
        recommendations = []

        if progress < 50:
            recommendations.append(
                f"Test is {progress:.0f}% complete - continue collecting data"
            )

        if progress >= 100:
            if significance['statistical_analysis']['is_significant_95']:
                recommendations.append(
                    "Sufficient data collected with significant results - ready to conclude test"
                )
            else:
                recommendations.append(
                    "Sample size reached but no significant difference - consider extending test or concluding"
                )

        return recommendations

    def _determine_next_steps(
        self,
        significance: Dict[str, Any],
        progress: float
    ) -> str:
        """Determine next steps for test."""
        if progress < 100:
            return f"Continue test until reaching 100% sample size (currently {progress:.0f}%)"

        decision = significance.get('decision', {}).get('decision', 'inconclusive')

        if decision == 'implement_b':
            return "Implement Variant B and monitor metrics for 2 weeks"
        elif decision == 'keep_a':
            return "Keep Variant A and design new test with different hypothesis"
        else:
            return "Test inconclusive - either keep A or design new test"

    def _generate_test_insights(
        self,
        test: Dict[str, Any],
        significance: Dict[str, Any],
        results: Dict[str, Any]
    ) -> List[str]:
        """Generate insights from test results."""
        insights = []

        improvement = significance['improvement']['relative_percentage']

        if significance['statistical_analysis']['is_significant_95']:
            insights.append(
                f"Strong evidence: Variant B {'improved' if improvement > 0 else 'decreased'} "
                f"conversion by {abs(improvement):.1f}% with 95% confidence"
            )

        insights.append(
            f"Tested {test['test_type']} changes: {test['hypothesis']}"
        )

        # Add context-specific insights
        if test['test_type'] == 'icon' and improvement > 5:
            insights.append(
                "Icon change had substantial impact - visual first impression is critical"
            )

        return insights

    def _create_implementation_plan(
        self,
        test: Dict[str, Any],
        significance: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Create implementation plan for winning variant."""
        plan = []

        if significance.get('decision', {}).get('decision') == 'implement_b':
            plan.append({
                'step': '1. Update store listing',
                'details': f"Replace {test['test_type']} with Variant B across all platforms"
            })
            plan.append({
                'step': '2. Monitor metrics',
                'details': 'Track conversion rate for 2 weeks to confirm sustained improvement'
            })
            plan.append({
                'step': '3. Document learnings',
                'details': 'Record insights for future optimization'
            })

        return plan

    def _extract_learnings(
        self,
        test: Dict[str, Any],
        significance: Dict[str, Any]
    ) -> List[str]:
        """Extract key learnings from test."""
        learnings = []

        improvement = significance['improvement']['relative_percentage']

        learnings.append(
            f"Testing {test['test_type']} can yield {abs(improvement):.1f}% conversion change"
        )

        if test['test_type'] == 'title':
            learnings.append(
                "Title changes affect search visibility and user perception"
            )
        elif test['test_type'] == 'screenshot':
            learnings.append(
                "First 2-3 screenshots are critical for conversion"
            )

        return learnings


def plan_ab_test(
    test_type: str,
    variant_a: Dict[str, Any],
    variant_b: Dict[str, Any],
    hypothesis: str,
    baseline_conversion: float
) -> Dict[str, Any]:
    """
    Convenience function to plan an A/B test.

    Args:
        test_type: Type of test
        variant_a: Control variant
        variant_b: Test variant
        hypothesis: Test hypothesis
        baseline_conversion: Current conversion rate

    Returns:
        Complete test plan
    """
    planner = ABTestPlanner()

    test_design = planner.design_test(
        test_type,
        variant_a,
        variant_b,
        hypothesis
    )

    sample_size = planner.calculate_sample_size(
        baseline_conversion,
        planner.MIN_EFFECT_SIZES.get(test_type, 0.05)
    )

    return {
        'test_design': test_design,
        'sample_size_requirements': sample_size
    }
