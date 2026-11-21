"""
Performance analysis and recommendation module.
Provides insights and optimization recommendations.
"""

from typing import Dict, List, Any


class PerformanceAnalyzer:
    """Analyze campaign performance and generate recommendations."""

    # Industry benchmark ranges
    BENCHMARKS = {
        'facebook': {'engagement_rate': 0.09, 'ctr': 0.90},
        'instagram': {'engagement_rate': 1.22, 'ctr': 0.22},
        'twitter': {'engagement_rate': 0.045, 'ctr': 1.64},
        'linkedin': {'engagement_rate': 0.54, 'ctr': 0.39},
        'tiktok': {'engagement_rate': 5.96, 'ctr': 1.00}
    }

    def __init__(self, campaign_metrics: Dict[str, Any], roi_metrics: Dict[str, Any]):
        """
        Initialize with calculated metrics.

        Args:
            campaign_metrics: Dictionary of campaign performance metrics
            roi_metrics: Dictionary of ROI and cost metrics
        """
        self.campaign_metrics = campaign_metrics
        self.roi_metrics = roi_metrics
        self.platform = campaign_metrics.get('platform', 'unknown').lower()

    def benchmark_performance(self) -> Dict[str, str]:
        """Compare metrics against industry benchmarks."""
        benchmarks = self.BENCHMARKS.get(self.platform, {})

        if not benchmarks:
            return {'status': 'no_benchmark_available'}

        engagement_rate = self.campaign_metrics.get('avg_engagement_rate', 0)
        ctr = self.campaign_metrics.get('ctr', 0)

        benchmark_engagement = benchmarks.get('engagement_rate', 0)
        benchmark_ctr = benchmarks.get('ctr', 0)

        engagement_status = 'excellent' if engagement_rate >= benchmark_engagement * 1.5 else \
                          'good' if engagement_rate >= benchmark_engagement else \
                          'below_average'

        ctr_status = 'excellent' if ctr >= benchmark_ctr * 1.5 else \
                    'good' if ctr >= benchmark_ctr else \
                    'below_average'

        return {
            'engagement_status': engagement_status,
            'engagement_benchmark': f"{benchmark_engagement}%",
            'engagement_actual': f"{engagement_rate:.2f}%",
            'ctr_status': ctr_status,
            'ctr_benchmark': f"{benchmark_ctr}%",
            'ctr_actual': f"{ctr:.2f}%"
        }

    def generate_recommendations(self) -> List[str]:
        """Generate actionable recommendations based on performance."""
        recommendations = []

        # Analyze engagement rate
        engagement_rate = self.campaign_metrics.get('avg_engagement_rate', 0)
        if engagement_rate < 1.0:
            recommendations.append(
                "Low engagement rate detected. Consider: (1) Posting during peak audience activity times, "
                "(2) Using more interactive content formats (polls, questions), "
                "(3) Improving visual quality of posts"
            )

        # Analyze CTR
        ctr = self.campaign_metrics.get('ctr', 0)
        if ctr < 0.5:
            recommendations.append(
                "Click-through rate is below average. Try: (1) Stronger call-to-action statements, "
                "(2) More compelling headlines, (3) Better alignment between content and audience interests"
            )

        # Analyze cost efficiency
        cpc = self.roi_metrics.get('cost_per_click', 0)
        if cpc > 1.00:
            recommendations.append(
                f"Cost per click (${cpc:.2f}) is high. Optimize by: (1) Refining audience targeting, "
                "(2) Testing different ad creatives, (3) Adjusting bidding strategy"
            )

        # Analyze ROI
        roi = self.roi_metrics.get('roi_percentage', 0)
        if roi < 100:
            recommendations.append(
                f"ROI ({roi:.1f}%) needs improvement. Focus on: (1) Conversion rate optimization, "
                "(2) Reducing cost per acquisition, (3) Better audience segmentation"
            )
        elif roi > 200:
            recommendations.append(
                f"Excellent ROI ({roi:.1f}%)! Consider: (1) Scaling this campaign with increased budget, "
                "(2) Replicating successful elements to other campaigns, (3) Testing similar audiences"
            )

        # Post frequency analysis
        total_posts = self.campaign_metrics.get('total_posts', 0)
        if total_posts < 10:
            recommendations.append(
                "Limited post volume may affect insights accuracy. Consider increasing posting frequency "
                "to gather more performance data"
            )

        # Default positive recommendation if performing well
        if not recommendations:
            recommendations.append(
                "Campaign is performing well across all metrics. Continue current strategy while "
                "testing minor variations to optimize further"
            )

        return recommendations

    def generate_insights(self) -> Dict[str, Any]:
        """Generate comprehensive performance insights."""
        benchmark_results = self.benchmark_performance()
        recommendations = self.generate_recommendations()

        # Determine overall campaign health
        engagement_status = benchmark_results.get('engagement_status', 'unknown')
        ctr_status = benchmark_results.get('ctr_status', 'unknown')

        if engagement_status == 'excellent' and ctr_status == 'excellent':
            overall_health = 'excellent'
        elif engagement_status in ['good', 'excellent'] and ctr_status in ['good', 'excellent']:
            overall_health = 'good'
        else:
            overall_health = 'needs_improvement'

        return {
            'overall_health': overall_health,
            'benchmark_comparison': benchmark_results,
            'recommendations': recommendations,
            'key_strengths': self._identify_strengths(),
            'areas_for_improvement': self._identify_weaknesses()
        }

    def _identify_strengths(self) -> List[str]:
        """Identify campaign strengths."""
        strengths = []

        engagement_rate = self.campaign_metrics.get('avg_engagement_rate', 0)
        if engagement_rate > 1.0:
            strengths.append("Strong audience engagement")

        roi = self.roi_metrics.get('roi_percentage', 0)
        if roi > 150:
            strengths.append("Excellent return on investment")

        ctr = self.campaign_metrics.get('ctr', 0)
        if ctr > 1.0:
            strengths.append("High click-through rate")

        return strengths if strengths else ["Campaign shows baseline performance"]

    def _identify_weaknesses(self) -> List[str]:
        """Identify areas needing improvement."""
        weaknesses = []

        engagement_rate = self.campaign_metrics.get('avg_engagement_rate', 0)
        if engagement_rate < 0.5:
            weaknesses.append("Low engagement rate - content may not resonate with audience")

        roi = self.roi_metrics.get('roi_percentage', 0)
        if roi < 50:
            weaknesses.append("ROI below target - need to improve conversion or reduce costs")

        cpc = self.roi_metrics.get('cost_per_click', 0)
        if cpc > 2.00:
            weaknesses.append("High cost per click - targeting or bidding needs optimization")

        return weaknesses if weaknesses else ["No critical weaknesses identified"]
