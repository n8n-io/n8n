"""
Keyword analysis module for App Store Optimization.
Analyzes keyword search volume, competition, and relevance for app discovery.
"""

from typing import Dict, List, Any, Optional, Tuple
import re
from collections import Counter


class KeywordAnalyzer:
    """Analyzes keywords for ASO effectiveness."""

    # Competition level thresholds (based on number of competing apps)
    COMPETITION_THRESHOLDS = {
        'low': 1000,
        'medium': 5000,
        'high': 10000
    }

    # Search volume categories (monthly searches estimate)
    VOLUME_CATEGORIES = {
        'very_low': 1000,
        'low': 5000,
        'medium': 20000,
        'high': 100000,
        'very_high': 500000
    }

    def __init__(self):
        """Initialize keyword analyzer."""
        self.analyzed_keywords = {}

    def analyze_keyword(
        self,
        keyword: str,
        search_volume: int = 0,
        competing_apps: int = 0,
        relevance_score: float = 0.0
    ) -> Dict[str, Any]:
        """
        Analyze a single keyword for ASO potential.

        Args:
            keyword: The keyword to analyze
            search_volume: Estimated monthly search volume
            competing_apps: Number of apps competing for this keyword
            relevance_score: Relevance to your app (0.0-1.0)

        Returns:
            Dictionary with keyword analysis
        """
        competition_level = self._calculate_competition_level(competing_apps)
        volume_category = self._categorize_search_volume(search_volume)
        difficulty_score = self._calculate_keyword_difficulty(
            search_volume,
            competing_apps
        )

        # Calculate potential score (0-100)
        potential_score = self._calculate_potential_score(
            search_volume,
            competing_apps,
            relevance_score
        )

        analysis = {
            'keyword': keyword,
            'search_volume': search_volume,
            'volume_category': volume_category,
            'competing_apps': competing_apps,
            'competition_level': competition_level,
            'relevance_score': relevance_score,
            'difficulty_score': difficulty_score,
            'potential_score': potential_score,
            'recommendation': self._generate_recommendation(
                potential_score,
                difficulty_score,
                relevance_score
            ),
            'keyword_length': len(keyword.split()),
            'is_long_tail': len(keyword.split()) >= 3
        }

        self.analyzed_keywords[keyword] = analysis
        return analysis

    def compare_keywords(self, keywords_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Compare multiple keywords and rank by potential.

        Args:
            keywords_data: List of dicts with keyword, search_volume, competing_apps, relevance_score

        Returns:
            Comparison report with ranked keywords
        """
        analyses = []
        for kw_data in keywords_data:
            analysis = self.analyze_keyword(
                keyword=kw_data['keyword'],
                search_volume=kw_data.get('search_volume', 0),
                competing_apps=kw_data.get('competing_apps', 0),
                relevance_score=kw_data.get('relevance_score', 0.0)
            )
            analyses.append(analysis)

        # Sort by potential score (descending)
        ranked_keywords = sorted(
            analyses,
            key=lambda x: x['potential_score'],
            reverse=True
        )

        # Categorize keywords
        primary_keywords = [
            kw for kw in ranked_keywords
            if kw['potential_score'] >= 70 and kw['relevance_score'] >= 0.8
        ]

        secondary_keywords = [
            kw for kw in ranked_keywords
            if 50 <= kw['potential_score'] < 70 and kw['relevance_score'] >= 0.6
        ]

        long_tail_keywords = [
            kw for kw in ranked_keywords
            if kw['is_long_tail'] and kw['relevance_score'] >= 0.7
        ]

        return {
            'total_keywords_analyzed': len(analyses),
            'ranked_keywords': ranked_keywords,
            'primary_keywords': primary_keywords[:5],  # Top 5
            'secondary_keywords': secondary_keywords[:10],  # Top 10
            'long_tail_keywords': long_tail_keywords[:10],  # Top 10
            'summary': self._generate_comparison_summary(
                primary_keywords,
                secondary_keywords,
                long_tail_keywords
            )
        }

    def find_long_tail_opportunities(
        self,
        base_keyword: str,
        modifiers: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Generate long-tail keyword variations.

        Args:
            base_keyword: Core keyword (e.g., "task manager")
            modifiers: List of modifiers (e.g., ["free", "simple", "team"])

        Returns:
            List of long-tail keyword suggestions
        """
        long_tail_keywords = []

        # Generate combinations
        for modifier in modifiers:
            # Modifier + base
            variation1 = f"{modifier} {base_keyword}"
            long_tail_keywords.append({
                'keyword': variation1,
                'pattern': 'modifier_base',
                'estimated_competition': 'low',
                'rationale': f"Less competitive variation of '{base_keyword}'"
            })

            # Base + modifier
            variation2 = f"{base_keyword} {modifier}"
            long_tail_keywords.append({
                'keyword': variation2,
                'pattern': 'base_modifier',
                'estimated_competition': 'low',
                'rationale': f"Specific use-case variation of '{base_keyword}'"
            })

        # Add question-based long-tail
        question_words = ['how', 'what', 'best', 'top']
        for q_word in question_words:
            question_keyword = f"{q_word} {base_keyword}"
            long_tail_keywords.append({
                'keyword': question_keyword,
                'pattern': 'question_based',
                'estimated_competition': 'very_low',
                'rationale': f"Informational search query"
            })

        return long_tail_keywords

    def extract_keywords_from_text(
        self,
        text: str,
        min_word_length: int = 3
    ) -> List[Tuple[str, int]]:
        """
        Extract potential keywords from text (descriptions, reviews).

        Args:
            text: Text to analyze
            min_word_length: Minimum word length to consider

        Returns:
            List of (keyword, frequency) tuples
        """
        # Clean and normalize text
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)

        # Extract words
        words = text.split()

        # Filter by length
        words = [w for w in words if len(w) >= min_word_length]

        # Remove common stop words
        stop_words = {
            'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have',
            'but', 'not', 'you', 'all', 'can', 'are', 'was', 'were', 'been'
        }
        words = [w for w in words if w not in stop_words]

        # Count frequency
        word_counts = Counter(words)

        # Extract 2-word phrases
        phrases = []
        for i in range(len(words) - 1):
            phrase = f"{words[i]} {words[i+1]}"
            phrases.append(phrase)

        phrase_counts = Counter(phrases)

        # Combine and sort
        all_keywords = list(word_counts.items()) + list(phrase_counts.items())
        all_keywords.sort(key=lambda x: x[1], reverse=True)

        return all_keywords[:50]  # Top 50

    def calculate_keyword_density(
        self,
        text: str,
        target_keywords: List[str]
    ) -> Dict[str, float]:
        """
        Calculate keyword density in text.

        Args:
            text: Text to analyze (title, description)
            target_keywords: Keywords to check density for

        Returns:
            Dictionary of keyword: density (percentage)
        """
        text_lower = text.lower()
        total_words = len(text_lower.split())

        densities = {}
        for keyword in target_keywords:
            keyword_lower = keyword.lower()
            occurrences = text_lower.count(keyword_lower)
            density = (occurrences / total_words) * 100 if total_words > 0 else 0
            densities[keyword] = round(density, 2)

        return densities

    def _calculate_competition_level(self, competing_apps: int) -> str:
        """Determine competition level based on number of competing apps."""
        if competing_apps < self.COMPETITION_THRESHOLDS['low']:
            return 'low'
        elif competing_apps < self.COMPETITION_THRESHOLDS['medium']:
            return 'medium'
        elif competing_apps < self.COMPETITION_THRESHOLDS['high']:
            return 'high'
        else:
            return 'very_high'

    def _categorize_search_volume(self, search_volume: int) -> str:
        """Categorize search volume."""
        if search_volume < self.VOLUME_CATEGORIES['very_low']:
            return 'very_low'
        elif search_volume < self.VOLUME_CATEGORIES['low']:
            return 'low'
        elif search_volume < self.VOLUME_CATEGORIES['medium']:
            return 'medium'
        elif search_volume < self.VOLUME_CATEGORIES['high']:
            return 'high'
        else:
            return 'very_high'

    def _calculate_keyword_difficulty(
        self,
        search_volume: int,
        competing_apps: int
    ) -> float:
        """
        Calculate keyword difficulty score (0-100).
        Higher score = harder to rank.
        """
        if competing_apps == 0:
            return 0.0

        # Competition factor (0-1)
        competition_factor = min(competing_apps / 50000, 1.0)

        # Volume factor (0-1) - higher volume = more difficulty
        volume_factor = min(search_volume / 1000000, 1.0)

        # Difficulty score (weighted average)
        difficulty = (competition_factor * 0.7 + volume_factor * 0.3) * 100

        return round(difficulty, 1)

    def _calculate_potential_score(
        self,
        search_volume: int,
        competing_apps: int,
        relevance_score: float
    ) -> float:
        """
        Calculate overall keyword potential (0-100).
        Higher score = better opportunity.
        """
        # Volume score (0-40 points)
        volume_score = min((search_volume / 100000) * 40, 40)

        # Competition score (0-30 points) - inverse relationship
        if competing_apps > 0:
            competition_score = max(30 - (competing_apps / 500), 0)
        else:
            competition_score = 30

        # Relevance score (0-30 points)
        relevance_points = relevance_score * 30

        total_score = volume_score + competition_score + relevance_points

        return round(min(total_score, 100), 1)

    def _generate_recommendation(
        self,
        potential_score: float,
        difficulty_score: float,
        relevance_score: float
    ) -> str:
        """Generate actionable recommendation for keyword."""
        if relevance_score < 0.5:
            return "Low relevance - avoid targeting"

        if potential_score >= 70:
            return "High priority - target immediately"
        elif potential_score >= 50:
            if difficulty_score < 50:
                return "Good opportunity - include in metadata"
            else:
                return "Competitive - use in description, not title"
        elif potential_score >= 30:
            return "Secondary keyword - use for long-tail variations"
        else:
            return "Low potential - deprioritize"

    def _generate_comparison_summary(
        self,
        primary_keywords: List[Dict[str, Any]],
        secondary_keywords: List[Dict[str, Any]],
        long_tail_keywords: List[Dict[str, Any]]
    ) -> str:
        """Generate summary of keyword comparison."""
        summary_parts = []

        summary_parts.append(
            f"Identified {len(primary_keywords)} high-priority primary keywords."
        )

        if primary_keywords:
            top_keyword = primary_keywords[0]['keyword']
            summary_parts.append(
                f"Top recommendation: '{top_keyword}' (potential score: {primary_keywords[0]['potential_score']})."
            )

        summary_parts.append(
            f"Found {len(secondary_keywords)} secondary keywords for description and metadata."
        )

        summary_parts.append(
            f"Discovered {len(long_tail_keywords)} long-tail opportunities with lower competition."
        )

        return " ".join(summary_parts)


def analyze_keyword_set(keywords_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Convenience function to analyze a set of keywords.

    Args:
        keywords_data: List of keyword data dictionaries

    Returns:
        Complete analysis report
    """
    analyzer = KeywordAnalyzer()
    return analyzer.compare_keywords(keywords_data)
