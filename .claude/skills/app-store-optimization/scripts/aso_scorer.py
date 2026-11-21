"""
ASO scoring module for App Store Optimization.
Calculates comprehensive ASO health score across multiple dimensions.
"""

from typing import Dict, List, Any, Optional


class ASOScorer:
    """Calculates overall ASO health score and provides recommendations."""

    # Score weights for different components (total = 100)
    WEIGHTS = {
        'metadata_quality': 25,
        'ratings_reviews': 25,
        'keyword_performance': 25,
        'conversion_metrics': 25
    }

    # Benchmarks for scoring
    BENCHMARKS = {
        'title_keyword_usage': {'min': 1, 'target': 2},
        'description_length': {'min': 500, 'target': 2000},
        'keyword_density': {'min': 2, 'optimal': 5, 'max': 8},
        'average_rating': {'min': 3.5, 'target': 4.5},
        'ratings_count': {'min': 100, 'target': 5000},
        'keywords_top_10': {'min': 2, 'target': 10},
        'keywords_top_50': {'min': 5, 'target': 20},
        'conversion_rate': {'min': 0.02, 'target': 0.10}
    }

    def __init__(self):
        """Initialize ASO scorer."""
        self.score_breakdown = {}

    def calculate_overall_score(
        self,
        metadata: Dict[str, Any],
        ratings: Dict[str, Any],
        keyword_performance: Dict[str, Any],
        conversion: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive ASO score (0-100).

        Args:
            metadata: Title, description quality metrics
            ratings: Rating average and count
            keyword_performance: Keyword ranking data
            conversion: Impression-to-install metrics

        Returns:
            Overall score with detailed breakdown
        """
        # Calculate component scores
        metadata_score = self.score_metadata_quality(metadata)
        ratings_score = self.score_ratings_reviews(ratings)
        keyword_score = self.score_keyword_performance(keyword_performance)
        conversion_score = self.score_conversion_metrics(conversion)

        # Calculate weighted overall score
        overall_score = (
            metadata_score * (self.WEIGHTS['metadata_quality'] / 100) +
            ratings_score * (self.WEIGHTS['ratings_reviews'] / 100) +
            keyword_score * (self.WEIGHTS['keyword_performance'] / 100) +
            conversion_score * (self.WEIGHTS['conversion_metrics'] / 100)
        )

        # Store breakdown
        self.score_breakdown = {
            'metadata_quality': {
                'score': metadata_score,
                'weight': self.WEIGHTS['metadata_quality'],
                'weighted_contribution': round(metadata_score * (self.WEIGHTS['metadata_quality'] / 100), 1)
            },
            'ratings_reviews': {
                'score': ratings_score,
                'weight': self.WEIGHTS['ratings_reviews'],
                'weighted_contribution': round(ratings_score * (self.WEIGHTS['ratings_reviews'] / 100), 1)
            },
            'keyword_performance': {
                'score': keyword_score,
                'weight': self.WEIGHTS['keyword_performance'],
                'weighted_contribution': round(keyword_score * (self.WEIGHTS['keyword_performance'] / 100), 1)
            },
            'conversion_metrics': {
                'score': conversion_score,
                'weight': self.WEIGHTS['conversion_metrics'],
                'weighted_contribution': round(conversion_score * (self.WEIGHTS['conversion_metrics'] / 100), 1)
            }
        }

        # Generate recommendations
        recommendations = self.generate_recommendations(
            metadata_score,
            ratings_score,
            keyword_score,
            conversion_score
        )

        # Assess overall health
        health_status = self._assess_health_status(overall_score)

        return {
            'overall_score': round(overall_score, 1),
            'health_status': health_status,
            'score_breakdown': self.score_breakdown,
            'recommendations': recommendations,
            'priority_actions': self._prioritize_actions(recommendations),
            'strengths': self._identify_strengths(self.score_breakdown),
            'weaknesses': self._identify_weaknesses(self.score_breakdown)
        }

    def score_metadata_quality(self, metadata: Dict[str, Any]) -> float:
        """
        Score metadata quality (0-100).

        Evaluates:
        - Title optimization
        - Description quality
        - Keyword usage
        """
        scores = []

        # Title score (0-35 points)
        title_keywords = metadata.get('title_keyword_count', 0)
        title_length = metadata.get('title_length', 0)

        title_score = 0
        if title_keywords >= self.BENCHMARKS['title_keyword_usage']['target']:
            title_score = 35
        elif title_keywords >= self.BENCHMARKS['title_keyword_usage']['min']:
            title_score = 25
        else:
            title_score = 10

        # Adjust for title length usage
        if title_length > 25:  # Using most of available space
            title_score += 0
        else:
            title_score -= 5

        scores.append(min(title_score, 35))

        # Description score (0-35 points)
        desc_length = metadata.get('description_length', 0)
        desc_quality = metadata.get('description_quality', 0.0)  # 0-1 scale

        desc_score = 0
        if desc_length >= self.BENCHMARKS['description_length']['target']:
            desc_score = 25
        elif desc_length >= self.BENCHMARKS['description_length']['min']:
            desc_score = 15
        else:
            desc_score = 5

        # Add quality bonus
        desc_score += desc_quality * 10
        scores.append(min(desc_score, 35))

        # Keyword density score (0-30 points)
        keyword_density = metadata.get('keyword_density', 0.0)

        if self.BENCHMARKS['keyword_density']['min'] <= keyword_density <= self.BENCHMARKS['keyword_density']['optimal']:
            density_score = 30
        elif keyword_density < self.BENCHMARKS['keyword_density']['min']:
            # Too low - proportional scoring
            density_score = (keyword_density / self.BENCHMARKS['keyword_density']['min']) * 20
        else:
            # Too high (keyword stuffing) - penalty
            excess = keyword_density - self.BENCHMARKS['keyword_density']['optimal']
            density_score = max(30 - (excess * 5), 0)

        scores.append(density_score)

        return round(sum(scores), 1)

    def score_ratings_reviews(self, ratings: Dict[str, Any]) -> float:
        """
        Score ratings and reviews (0-100).

        Evaluates:
        - Average rating
        - Total ratings count
        - Review velocity
        """
        average_rating = ratings.get('average_rating', 0.0)
        total_ratings = ratings.get('total_ratings', 0)
        recent_ratings = ratings.get('recent_ratings_30d', 0)

        # Rating quality score (0-50 points)
        if average_rating >= self.BENCHMARKS['average_rating']['target']:
            rating_quality_score = 50
        elif average_rating >= self.BENCHMARKS['average_rating']['min']:
            # Proportional scoring between min and target
            proportion = (average_rating - self.BENCHMARKS['average_rating']['min']) / \
                        (self.BENCHMARKS['average_rating']['target'] - self.BENCHMARKS['average_rating']['min'])
            rating_quality_score = 30 + (proportion * 20)
        elif average_rating >= 3.0:
            rating_quality_score = 20
        else:
            rating_quality_score = 10

        # Rating volume score (0-30 points)
        if total_ratings >= self.BENCHMARKS['ratings_count']['target']:
            rating_volume_score = 30
        elif total_ratings >= self.BENCHMARKS['ratings_count']['min']:
            # Proportional scoring
            proportion = (total_ratings - self.BENCHMARKS['ratings_count']['min']) / \
                        (self.BENCHMARKS['ratings_count']['target'] - self.BENCHMARKS['ratings_count']['min'])
            rating_volume_score = 15 + (proportion * 15)
        else:
            # Very low volume
            rating_volume_score = (total_ratings / self.BENCHMARKS['ratings_count']['min']) * 15

        # Rating velocity score (0-20 points)
        if recent_ratings > 100:
            velocity_score = 20
        elif recent_ratings > 50:
            velocity_score = 15
        elif recent_ratings > 10:
            velocity_score = 10
        else:
            velocity_score = 5

        total_score = rating_quality_score + rating_volume_score + velocity_score

        return round(min(total_score, 100), 1)

    def score_keyword_performance(self, keyword_performance: Dict[str, Any]) -> float:
        """
        Score keyword ranking performance (0-100).

        Evaluates:
        - Top 10 rankings
        - Top 50 rankings
        - Ranking trends
        """
        top_10_count = keyword_performance.get('top_10', 0)
        top_50_count = keyword_performance.get('top_50', 0)
        top_100_count = keyword_performance.get('top_100', 0)
        improving_keywords = keyword_performance.get('improving_keywords', 0)

        # Top 10 score (0-50 points) - most valuable rankings
        if top_10_count >= self.BENCHMARKS['keywords_top_10']['target']:
            top_10_score = 50
        elif top_10_count >= self.BENCHMARKS['keywords_top_10']['min']:
            proportion = (top_10_count - self.BENCHMARKS['keywords_top_10']['min']) / \
                        (self.BENCHMARKS['keywords_top_10']['target'] - self.BENCHMARKS['keywords_top_10']['min'])
            top_10_score = 25 + (proportion * 25)
        else:
            top_10_score = (top_10_count / self.BENCHMARKS['keywords_top_10']['min']) * 25

        # Top 50 score (0-30 points)
        if top_50_count >= self.BENCHMARKS['keywords_top_50']['target']:
            top_50_score = 30
        elif top_50_count >= self.BENCHMARKS['keywords_top_50']['min']:
            proportion = (top_50_count - self.BENCHMARKS['keywords_top_50']['min']) / \
                        (self.BENCHMARKS['keywords_top_50']['target'] - self.BENCHMARKS['keywords_top_50']['min'])
            top_50_score = 15 + (proportion * 15)
        else:
            top_50_score = (top_50_count / self.BENCHMARKS['keywords_top_50']['min']) * 15

        # Coverage score (0-10 points) - based on top 100
        coverage_score = min((top_100_count / 30) * 10, 10)

        # Trend score (0-10 points) - are rankings improving?
        if improving_keywords > 5:
            trend_score = 10
        elif improving_keywords > 0:
            trend_score = 5
        else:
            trend_score = 0

        total_score = top_10_score + top_50_score + coverage_score + trend_score

        return round(min(total_score, 100), 1)

    def score_conversion_metrics(self, conversion: Dict[str, Any]) -> float:
        """
        Score conversion performance (0-100).

        Evaluates:
        - Impression-to-install conversion rate
        - Download velocity
        """
        conversion_rate = conversion.get('impression_to_install', 0.0)
        downloads_30d = conversion.get('downloads_last_30_days', 0)
        downloads_trend = conversion.get('downloads_trend', 'stable')  # 'up', 'stable', 'down'

        # Conversion rate score (0-70 points)
        if conversion_rate >= self.BENCHMARKS['conversion_rate']['target']:
            conversion_score = 70
        elif conversion_rate >= self.BENCHMARKS['conversion_rate']['min']:
            proportion = (conversion_rate - self.BENCHMARKS['conversion_rate']['min']) / \
                        (self.BENCHMARKS['conversion_rate']['target'] - self.BENCHMARKS['conversion_rate']['min'])
            conversion_score = 35 + (proportion * 35)
        else:
            conversion_score = (conversion_rate / self.BENCHMARKS['conversion_rate']['min']) * 35

        # Download velocity score (0-20 points)
        if downloads_30d > 10000:
            velocity_score = 20
        elif downloads_30d > 1000:
            velocity_score = 15
        elif downloads_30d > 100:
            velocity_score = 10
        else:
            velocity_score = 5

        # Trend bonus (0-10 points)
        if downloads_trend == 'up':
            trend_score = 10
        elif downloads_trend == 'stable':
            trend_score = 5
        else:
            trend_score = 0

        total_score = conversion_score + velocity_score + trend_score

        return round(min(total_score, 100), 1)

    def generate_recommendations(
        self,
        metadata_score: float,
        ratings_score: float,
        keyword_score: float,
        conversion_score: float
    ) -> List[Dict[str, Any]]:
        """Generate prioritized recommendations based on scores."""
        recommendations = []

        # Metadata recommendations
        if metadata_score < 60:
            recommendations.append({
                'category': 'metadata_quality',
                'priority': 'high',
                'action': 'Optimize app title and description',
                'details': 'Add more keywords to title, expand description to 1500-2000 characters, improve keyword density to 3-5%',
                'expected_impact': 'Improve discoverability and ranking potential'
            })
        elif metadata_score < 80:
            recommendations.append({
                'category': 'metadata_quality',
                'priority': 'medium',
                'action': 'Refine metadata for better keyword targeting',
                'details': 'Test variations of title/subtitle, optimize keyword field for Apple',
                'expected_impact': 'Incremental ranking improvements'
            })

        # Ratings recommendations
        if ratings_score < 60:
            recommendations.append({
                'category': 'ratings_reviews',
                'priority': 'high',
                'action': 'Improve rating quality and volume',
                'details': 'Address top user complaints, implement in-app rating prompts, respond to negative reviews',
                'expected_impact': 'Better conversion rates and trust signals'
            })
        elif ratings_score < 80:
            recommendations.append({
                'category': 'ratings_reviews',
                'priority': 'medium',
                'action': 'Increase rating velocity',
                'details': 'Optimize timing of rating requests, encourage satisfied users to rate',
                'expected_impact': 'Sustained rating quality'
            })

        # Keyword performance recommendations
        if keyword_score < 60:
            recommendations.append({
                'category': 'keyword_performance',
                'priority': 'high',
                'action': 'Improve keyword rankings',
                'details': 'Target long-tail keywords with lower competition, update metadata with high-potential keywords, build backlinks',
                'expected_impact': 'Significant improvement in organic visibility'
            })
        elif keyword_score < 80:
            recommendations.append({
                'category': 'keyword_performance',
                'priority': 'medium',
                'action': 'Expand keyword coverage',
                'details': 'Target additional related keywords, test seasonal keywords, localize for new markets',
                'expected_impact': 'Broader reach and more discovery opportunities'
            })

        # Conversion recommendations
        if conversion_score < 60:
            recommendations.append({
                'category': 'conversion_metrics',
                'priority': 'high',
                'action': 'Optimize store listing for conversions',
                'details': 'Improve screenshots and icon, strengthen value proposition in description, add video preview',
                'expected_impact': 'Higher impression-to-install conversion'
            })
        elif conversion_score < 80:
            recommendations.append({
                'category': 'conversion_metrics',
                'priority': 'medium',
                'action': 'Test visual asset variations',
                'details': 'A/B test different icon designs and screenshot sequences',
                'expected_impact': 'Incremental conversion improvements'
            })

        return recommendations

    def _assess_health_status(self, overall_score: float) -> str:
        """Assess overall ASO health status."""
        if overall_score >= 80:
            return "Excellent - Top-tier ASO performance"
        elif overall_score >= 65:
            return "Good - Competitive ASO with room for improvement"
        elif overall_score >= 50:
            return "Fair - Needs strategic improvements"
        else:
            return "Poor - Requires immediate ASO overhaul"

    def _prioritize_actions(
        self,
        recommendations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Prioritize actions by impact and urgency."""
        # Sort by priority (high first) and expected impact
        priority_order = {'high': 0, 'medium': 1, 'low': 2}

        sorted_recommendations = sorted(
            recommendations,
            key=lambda x: priority_order[x['priority']]
        )

        return sorted_recommendations[:3]  # Top 3 priority actions

    def _identify_strengths(self, score_breakdown: Dict[str, Any]) -> List[str]:
        """Identify areas of strength (scores >= 75)."""
        strengths = []

        for category, data in score_breakdown.items():
            if data['score'] >= 75:
                strengths.append(
                    f"{category.replace('_', ' ').title()}: {data['score']}/100"
                )

        return strengths if strengths else ["Focus on building strengths across all areas"]

    def _identify_weaknesses(self, score_breakdown: Dict[str, Any]) -> List[str]:
        """Identify areas needing improvement (scores < 60)."""
        weaknesses = []

        for category, data in score_breakdown.items():
            if data['score'] < 60:
                weaknesses.append(
                    f"{category.replace('_', ' ').title()}: {data['score']}/100 - needs improvement"
                )

        return weaknesses if weaknesses else ["All areas performing adequately"]


def calculate_aso_score(
    metadata: Dict[str, Any],
    ratings: Dict[str, Any],
    keyword_performance: Dict[str, Any],
    conversion: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Convenience function to calculate ASO score.

    Args:
        metadata: Metadata quality metrics
        ratings: Ratings data
        keyword_performance: Keyword ranking data
        conversion: Conversion metrics

    Returns:
        Complete ASO score report
    """
    scorer = ASOScorer()
    return scorer.calculate_overall_score(
        metadata,
        ratings,
        keyword_performance,
        conversion
    )
