"""
Competitor analysis module for App Store Optimization.
Analyzes top competitors' ASO strategies and identifies opportunities.
"""

from typing import Dict, List, Any, Optional
from collections import Counter
import re


class CompetitorAnalyzer:
    """Analyzes competitor apps to identify ASO opportunities."""

    def __init__(self, category: str, platform: str = 'apple'):
        """
        Initialize competitor analyzer.

        Args:
            category: App category (e.g., "Productivity", "Games")
            platform: 'apple' or 'google'
        """
        self.category = category
        self.platform = platform
        self.competitors = []

    def analyze_competitor(
        self,
        app_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze a single competitor's ASO strategy.

        Args:
            app_data: Dictionary with app_name, title, description, rating, ratings_count, keywords

        Returns:
            Comprehensive competitor analysis
        """
        app_name = app_data.get('app_name', '')
        title = app_data.get('title', '')
        description = app_data.get('description', '')
        rating = app_data.get('rating', 0.0)
        ratings_count = app_data.get('ratings_count', 0)
        keywords = app_data.get('keywords', [])

        analysis = {
            'app_name': app_name,
            'title_analysis': self._analyze_title(title),
            'description_analysis': self._analyze_description(description),
            'keyword_strategy': self._extract_keyword_strategy(title, description, keywords),
            'rating_metrics': {
                'rating': rating,
                'ratings_count': ratings_count,
                'rating_quality': self._assess_rating_quality(rating, ratings_count)
            },
            'competitive_strength': self._calculate_competitive_strength(
                rating,
                ratings_count,
                len(description)
            ),
            'key_differentiators': self._identify_differentiators(description)
        }

        self.competitors.append(analysis)
        return analysis

    def compare_competitors(
        self,
        competitors_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compare multiple competitors and identify patterns.

        Args:
            competitors_data: List of competitor data dictionaries

        Returns:
            Comparative analysis with insights
        """
        # Analyze each competitor
        analyses = []
        for comp_data in competitors_data:
            analysis = self.analyze_competitor(comp_data)
            analyses.append(analysis)

        # Extract common keywords across competitors
        all_keywords = []
        for analysis in analyses:
            all_keywords.extend(analysis['keyword_strategy']['primary_keywords'])

        common_keywords = self._find_common_keywords(all_keywords)

        # Identify keyword gaps (used by some but not all)
        keyword_gaps = self._identify_keyword_gaps(analyses)

        # Rank competitors by strength
        ranked_competitors = sorted(
            analyses,
            key=lambda x: x['competitive_strength'],
            reverse=True
        )

        # Analyze rating distribution
        rating_analysis = self._analyze_rating_distribution(analyses)

        # Identify best practices
        best_practices = self._identify_best_practices(ranked_competitors)

        return {
            'category': self.category,
            'platform': self.platform,
            'competitors_analyzed': len(analyses),
            'ranked_competitors': ranked_competitors,
            'common_keywords': common_keywords,
            'keyword_gaps': keyword_gaps,
            'rating_analysis': rating_analysis,
            'best_practices': best_practices,
            'opportunities': self._identify_opportunities(
                analyses,
                common_keywords,
                keyword_gaps
            )
        }

    def identify_gaps(
        self,
        your_app_data: Dict[str, Any],
        competitors_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Identify gaps between your app and competitors.

        Args:
            your_app_data: Your app's data
            competitors_data: List of competitor data

        Returns:
            Gap analysis with actionable recommendations
        """
        # Analyze your app
        your_analysis = self.analyze_competitor(your_app_data)

        # Analyze competitors
        competitor_comparison = self.compare_competitors(competitors_data)

        # Identify keyword gaps
        your_keywords = set(your_analysis['keyword_strategy']['primary_keywords'])
        competitor_keywords = set(competitor_comparison['common_keywords'])
        missing_keywords = competitor_keywords - your_keywords

        # Identify rating gap
        avg_competitor_rating = competitor_comparison['rating_analysis']['average_rating']
        rating_gap = avg_competitor_rating - your_analysis['rating_metrics']['rating']

        # Identify description length gap
        avg_competitor_desc_length = sum(
            len(comp['description_analysis']['text'])
            for comp in competitor_comparison['ranked_competitors']
        ) / len(competitor_comparison['ranked_competitors'])
        your_desc_length = len(your_analysis['description_analysis']['text'])
        desc_length_gap = avg_competitor_desc_length - your_desc_length

        return {
            'your_app': your_analysis,
            'keyword_gaps': {
                'missing_keywords': list(missing_keywords)[:10],
                'recommendations': self._generate_keyword_recommendations(missing_keywords)
            },
            'rating_gap': {
                'your_rating': your_analysis['rating_metrics']['rating'],
                'average_competitor_rating': avg_competitor_rating,
                'gap': round(rating_gap, 2),
                'action_items': self._generate_rating_improvement_actions(rating_gap)
            },
            'content_gap': {
                'your_description_length': your_desc_length,
                'average_competitor_length': int(avg_competitor_desc_length),
                'gap': int(desc_length_gap),
                'recommendations': self._generate_content_recommendations(desc_length_gap)
            },
            'competitive_positioning': self._assess_competitive_position(
                your_analysis,
                competitor_comparison
            )
        }

    def _analyze_title(self, title: str) -> Dict[str, Any]:
        """Analyze title structure and keyword usage."""
        parts = re.split(r'[-:|]', title)

        return {
            'title': title,
            'length': len(title),
            'has_brand': len(parts) > 0,
            'has_keywords': len(parts) > 1,
            'components': [part.strip() for part in parts],
            'word_count': len(title.split()),
            'strategy': 'brand_plus_keywords' if len(parts) > 1 else 'brand_only'
        }

    def _analyze_description(self, description: str) -> Dict[str, Any]:
        """Analyze description structure and content."""
        lines = description.split('\n')
        word_count = len(description.split())

        # Check for structural elements
        has_bullet_points = '•' in description or '*' in description
        has_sections = any(line.isupper() for line in lines if len(line) > 0)
        has_call_to_action = any(
            cta in description.lower()
            for cta in ['download', 'try', 'get', 'start', 'join']
        )

        # Extract features mentioned
        features = self._extract_features(description)

        return {
            'text': description,
            'length': len(description),
            'word_count': word_count,
            'structure': {
                'has_bullet_points': has_bullet_points,
                'has_sections': has_sections,
                'has_call_to_action': has_call_to_action
            },
            'features_mentioned': features,
            'readability': 'good' if 50 <= word_count <= 300 else 'needs_improvement'
        }

    def _extract_keyword_strategy(
        self,
        title: str,
        description: str,
        explicit_keywords: List[str]
    ) -> Dict[str, Any]:
        """Extract keyword strategy from metadata."""
        # Extract keywords from title
        title_keywords = [word.lower() for word in title.split() if len(word) > 3]

        # Extract frequently used words from description
        desc_words = re.findall(r'\b\w{4,}\b', description.lower())
        word_freq = Counter(desc_words)
        frequent_words = [word for word, count in word_freq.most_common(15) if count > 2]

        # Combine with explicit keywords
        all_keywords = list(set(title_keywords + frequent_words + explicit_keywords))

        return {
            'primary_keywords': title_keywords,
            'description_keywords': frequent_words[:10],
            'explicit_keywords': explicit_keywords,
            'total_unique_keywords': len(all_keywords),
            'keyword_focus': self._assess_keyword_focus(title_keywords, frequent_words)
        }

    def _assess_rating_quality(self, rating: float, ratings_count: int) -> str:
        """Assess the quality of ratings."""
        if ratings_count < 100:
            return 'insufficient_data'
        elif rating >= 4.5 and ratings_count > 1000:
            return 'excellent'
        elif rating >= 4.0 and ratings_count > 500:
            return 'good'
        elif rating >= 3.5:
            return 'average'
        else:
            return 'poor'

    def _calculate_competitive_strength(
        self,
        rating: float,
        ratings_count: int,
        description_length: int
    ) -> float:
        """
        Calculate overall competitive strength (0-100).

        Factors:
        - Rating quality (40%)
        - Rating volume (30%)
        - Metadata quality (30%)
        """
        # Rating quality score (0-40)
        rating_score = (rating / 5.0) * 40

        # Rating volume score (0-30)
        volume_score = min((ratings_count / 10000) * 30, 30)

        # Metadata quality score (0-30)
        metadata_score = min((description_length / 2000) * 30, 30)

        total_score = rating_score + volume_score + metadata_score

        return round(total_score, 1)

    def _identify_differentiators(self, description: str) -> List[str]:
        """Identify key differentiators from description."""
        differentiator_keywords = [
            'unique', 'only', 'first', 'best', 'leading', 'exclusive',
            'revolutionary', 'innovative', 'patent', 'award'
        ]

        differentiators = []
        sentences = description.split('.')

        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(keyword in sentence_lower for keyword in differentiator_keywords):
                differentiators.append(sentence.strip())

        return differentiators[:5]

    def _find_common_keywords(self, all_keywords: List[str]) -> List[str]:
        """Find keywords used by multiple competitors."""
        keyword_counts = Counter(all_keywords)
        # Return keywords used by at least 2 competitors
        common = [kw for kw, count in keyword_counts.items() if count >= 2]
        return sorted(common, key=lambda x: keyword_counts[x], reverse=True)[:20]

    def _identify_keyword_gaps(self, analyses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify keywords used by some competitors but not others."""
        all_keywords_by_app = {}

        for analysis in analyses:
            app_name = analysis['app_name']
            keywords = analysis['keyword_strategy']['primary_keywords']
            all_keywords_by_app[app_name] = set(keywords)

        # Find keywords used by some but not all
        all_keywords_set = set()
        for keywords in all_keywords_by_app.values():
            all_keywords_set.update(keywords)

        gaps = []
        for keyword in all_keywords_set:
            using_apps = [
                app for app, keywords in all_keywords_by_app.items()
                if keyword in keywords
            ]
            if 1 < len(using_apps) < len(analyses):
                gaps.append({
                    'keyword': keyword,
                    'used_by': using_apps,
                    'usage_percentage': round(len(using_apps) / len(analyses) * 100, 1)
                })

        return sorted(gaps, key=lambda x: x['usage_percentage'], reverse=True)[:15]

    def _analyze_rating_distribution(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze rating distribution across competitors."""
        ratings = [a['rating_metrics']['rating'] for a in analyses]
        ratings_counts = [a['rating_metrics']['ratings_count'] for a in analyses]

        return {
            'average_rating': round(sum(ratings) / len(ratings), 2),
            'highest_rating': max(ratings),
            'lowest_rating': min(ratings),
            'average_ratings_count': int(sum(ratings_counts) / len(ratings_counts)),
            'total_ratings_in_category': sum(ratings_counts)
        }

    def _identify_best_practices(self, ranked_competitors: List[Dict[str, Any]]) -> List[str]:
        """Identify best practices from top competitors."""
        if not ranked_competitors:
            return []

        top_competitor = ranked_competitors[0]
        practices = []

        # Title strategy
        title_analysis = top_competitor['title_analysis']
        if title_analysis['has_keywords']:
            practices.append(
                f"Title Strategy: Include primary keyword in title (e.g., '{title_analysis['title']}')"
            )

        # Description structure
        desc_analysis = top_competitor['description_analysis']
        if desc_analysis['structure']['has_bullet_points']:
            practices.append("Description: Use bullet points to highlight key features")

        if desc_analysis['structure']['has_sections']:
            practices.append("Description: Organize content with clear section headers")

        # Rating strategy
        rating_quality = top_competitor['rating_metrics']['rating_quality']
        if rating_quality in ['excellent', 'good']:
            practices.append(
                f"Ratings: Maintain high rating quality ({top_competitor['rating_metrics']['rating']}★) "
                f"with significant volume ({top_competitor['rating_metrics']['ratings_count']} ratings)"
            )

        return practices[:5]

    def _identify_opportunities(
        self,
        analyses: List[Dict[str, Any]],
        common_keywords: List[str],
        keyword_gaps: List[Dict[str, Any]]
    ) -> List[str]:
        """Identify ASO opportunities based on competitive analysis."""
        opportunities = []

        # Keyword opportunities from gaps
        if keyword_gaps:
            underutilized_keywords = [
                gap['keyword'] for gap in keyword_gaps
                if gap['usage_percentage'] < 50
            ]
            if underutilized_keywords:
                opportunities.append(
                    f"Target underutilized keywords: {', '.join(underutilized_keywords[:5])}"
                )

        # Rating opportunity
        avg_rating = sum(a['rating_metrics']['rating'] for a in analyses) / len(analyses)
        if avg_rating < 4.5:
            opportunities.append(
                f"Category average rating is {avg_rating:.1f} - opportunity to differentiate with higher ratings"
            )

        # Content depth opportunity
        avg_desc_length = sum(
            a['description_analysis']['length'] for a in analyses
        ) / len(analyses)
        if avg_desc_length < 1500:
            opportunities.append(
                "Competitors have relatively short descriptions - opportunity to provide more comprehensive information"
            )

        return opportunities[:5]

    def _extract_features(self, description: str) -> List[str]:
        """Extract feature mentions from description."""
        # Look for bullet points or numbered lists
        lines = description.split('\n')
        features = []

        for line in lines:
            line = line.strip()
            # Check if line starts with bullet or number
            if line and (line[0] in ['•', '*', '-', '✓'] or line[0].isdigit()):
                # Clean the line
                cleaned = re.sub(r'^[•*\-✓\d.)\s]+', '', line)
                if cleaned:
                    features.append(cleaned)

        return features[:10]

    def _assess_keyword_focus(
        self,
        title_keywords: List[str],
        description_keywords: List[str]
    ) -> str:
        """Assess keyword focus strategy."""
        overlap = set(title_keywords) & set(description_keywords)

        if len(overlap) >= 3:
            return 'consistent_focus'
        elif len(overlap) >= 1:
            return 'moderate_focus'
        else:
            return 'broad_focus'

    def _generate_keyword_recommendations(self, missing_keywords: set) -> List[str]:
        """Generate recommendations for missing keywords."""
        if not missing_keywords:
            return ["Your keyword coverage is comprehensive"]

        recommendations = []
        missing_list = list(missing_keywords)[:5]

        recommendations.append(
            f"Consider adding these competitor keywords: {', '.join(missing_list)}"
        )
        recommendations.append(
            "Test keyword variations in subtitle/promotional text first"
        )
        recommendations.append(
            "Monitor competitor keyword changes monthly"
        )

        return recommendations

    def _generate_rating_improvement_actions(self, rating_gap: float) -> List[str]:
        """Generate actions to improve ratings."""
        actions = []

        if rating_gap > 0.5:
            actions.append("CRITICAL: Significant rating gap - prioritize user satisfaction improvements")
            actions.append("Analyze negative reviews to identify top issues")
            actions.append("Implement in-app rating prompts after positive experiences")
            actions.append("Respond to all negative reviews professionally")
        elif rating_gap > 0.2:
            actions.append("Focus on incremental improvements to close rating gap")
            actions.append("Optimize timing of rating requests")
        else:
            actions.append("Ratings are competitive - maintain quality and continue improvements")

        return actions

    def _generate_content_recommendations(self, desc_length_gap: int) -> List[str]:
        """Generate content recommendations based on length gap."""
        recommendations = []

        if desc_length_gap > 500:
            recommendations.append(
                "Expand description to match competitor detail level"
            )
            recommendations.append(
                "Add use case examples and success stories"
            )
            recommendations.append(
                "Include more feature explanations and benefits"
            )
        elif desc_length_gap < -500:
            recommendations.append(
                "Consider condensing description for better readability"
            )
            recommendations.append(
                "Focus on most important features first"
            )
        else:
            recommendations.append(
                "Description length is competitive"
            )

        return recommendations

    def _assess_competitive_position(
        self,
        your_analysis: Dict[str, Any],
        competitor_comparison: Dict[str, Any]
    ) -> str:
        """Assess your competitive position."""
        your_strength = your_analysis['competitive_strength']
        competitors = competitor_comparison['ranked_competitors']

        if not competitors:
            return "No comparison data available"

        # Find where you'd rank
        better_than_count = sum(
            1 for comp in competitors
            if your_strength > comp['competitive_strength']
        )

        position_percentage = (better_than_count / len(competitors)) * 100

        if position_percentage >= 75:
            return "Strong Position: Top quartile in competitive strength"
        elif position_percentage >= 50:
            return "Competitive Position: Above average, opportunities for improvement"
        elif position_percentage >= 25:
            return "Challenging Position: Below average, requires strategic improvements"
        else:
            return "Weak Position: Bottom quartile, major ASO overhaul needed"


def analyze_competitor_set(
    category: str,
    competitors_data: List[Dict[str, Any]],
    platform: str = 'apple'
) -> Dict[str, Any]:
    """
    Convenience function to analyze a set of competitors.

    Args:
        category: App category
        competitors_data: List of competitor data
        platform: 'apple' or 'google'

    Returns:
        Complete competitive analysis
    """
    analyzer = CompetitorAnalyzer(category, platform)
    return analyzer.compare_competitors(competitors_data)
