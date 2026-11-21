"""
Localization helper module for App Store Optimization.
Manages multi-language ASO optimization strategies.
"""

from typing import Dict, List, Any, Optional, Tuple


class LocalizationHelper:
    """Helps manage multi-language ASO optimization."""

    # Priority markets by language (based on app store revenue and user base)
    PRIORITY_MARKETS = {
        'tier_1': [
            {'language': 'en-US', 'market': 'United States', 'revenue_share': 0.25},
            {'language': 'zh-CN', 'market': 'China', 'revenue_share': 0.20},
            {'language': 'ja-JP', 'market': 'Japan', 'revenue_share': 0.10},
            {'language': 'de-DE', 'market': 'Germany', 'revenue_share': 0.08},
            {'language': 'en-GB', 'market': 'United Kingdom', 'revenue_share': 0.06}
        ],
        'tier_2': [
            {'language': 'fr-FR', 'market': 'France', 'revenue_share': 0.05},
            {'language': 'ko-KR', 'market': 'South Korea', 'revenue_share': 0.05},
            {'language': 'es-ES', 'market': 'Spain', 'revenue_share': 0.03},
            {'language': 'it-IT', 'market': 'Italy', 'revenue_share': 0.03},
            {'language': 'pt-BR', 'market': 'Brazil', 'revenue_share': 0.03}
        ],
        'tier_3': [
            {'language': 'ru-RU', 'market': 'Russia', 'revenue_share': 0.02},
            {'language': 'es-MX', 'market': 'Mexico', 'revenue_share': 0.02},
            {'language': 'nl-NL', 'market': 'Netherlands', 'revenue_share': 0.02},
            {'language': 'sv-SE', 'market': 'Sweden', 'revenue_share': 0.01},
            {'language': 'pl-PL', 'market': 'Poland', 'revenue_share': 0.01}
        ]
    }

    # Character limit multipliers by language (some languages need more/less space)
    CHAR_MULTIPLIERS = {
        'en': 1.0,
        'zh': 0.6,  # Chinese characters are more compact
        'ja': 0.7,  # Japanese uses kanji
        'ko': 0.8,  # Korean is relatively compact
        'de': 1.3,  # German words are typically longer
        'fr': 1.2,  # French tends to be longer
        'es': 1.1,  # Spanish slightly longer
        'pt': 1.1,  # Portuguese similar to Spanish
        'ru': 1.1,  # Russian similar length
        'ar': 1.0,  # Arabic varies
        'it': 1.1   # Italian similar to Spanish
    }

    def __init__(self, app_category: str = 'general'):
        """
        Initialize localization helper.

        Args:
            app_category: App category to prioritize relevant markets
        """
        self.app_category = app_category
        self.localization_plans = []

    def identify_target_markets(
        self,
        current_market: str = 'en-US',
        budget_level: str = 'medium',
        target_market_count: int = 5
    ) -> Dict[str, Any]:
        """
        Recommend priority markets for localization.

        Args:
            current_market: Current/primary market
            budget_level: 'low', 'medium', or 'high'
            target_market_count: Number of markets to target

        Returns:
            Prioritized market recommendations
        """
        # Determine tier priorities based on budget
        if budget_level == 'low':
            priority_tiers = ['tier_1']
            max_markets = min(target_market_count, 3)
        elif budget_level == 'medium':
            priority_tiers = ['tier_1', 'tier_2']
            max_markets = min(target_market_count, 8)
        else:  # high budget
            priority_tiers = ['tier_1', 'tier_2', 'tier_3']
            max_markets = target_market_count

        # Collect markets from priority tiers
        recommended_markets = []
        for tier in priority_tiers:
            for market in self.PRIORITY_MARKETS[tier]:
                if market['language'] != current_market:
                    recommended_markets.append({
                        **market,
                        'tier': tier,
                        'estimated_translation_cost': self._estimate_translation_cost(
                            market['language']
                        )
                    })

        # Sort by revenue share and limit
        recommended_markets.sort(key=lambda x: x['revenue_share'], reverse=True)
        recommended_markets = recommended_markets[:max_markets]

        # Calculate potential ROI
        total_potential_revenue_share = sum(m['revenue_share'] for m in recommended_markets)

        return {
            'recommended_markets': recommended_markets,
            'total_markets': len(recommended_markets),
            'estimated_total_revenue_lift': f"{total_potential_revenue_share*100:.1f}%",
            'estimated_cost': self._estimate_total_localization_cost(recommended_markets),
            'implementation_priority': self._prioritize_implementation(recommended_markets)
        }

    def translate_metadata(
        self,
        source_metadata: Dict[str, str],
        source_language: str,
        target_language: str,
        platform: str = 'apple'
    ) -> Dict[str, Any]:
        """
        Generate localized metadata with character limit considerations.

        Args:
            source_metadata: Original metadata (title, description, etc.)
            source_language: Source language code (e.g., 'en')
            target_language: Target language code (e.g., 'es')
            platform: 'apple' or 'google'

        Returns:
            Localized metadata with character limit validation
        """
        # Get character multiplier
        target_lang_code = target_language.split('-')[0]
        char_multiplier = self.CHAR_MULTIPLIERS.get(target_lang_code, 1.0)

        # Platform-specific limits
        if platform == 'apple':
            limits = {'title': 30, 'subtitle': 30, 'description': 4000, 'keywords': 100}
        else:
            limits = {'title': 50, 'short_description': 80, 'description': 4000}

        localized_metadata = {}
        warnings = []

        for field, text in source_metadata.items():
            if field not in limits:
                continue

            # Estimate target length
            estimated_length = int(len(text) * char_multiplier)
            limit = limits[field]

            localized_metadata[field] = {
                'original_text': text,
                'original_length': len(text),
                'estimated_target_length': estimated_length,
                'character_limit': limit,
                'fits_within_limit': estimated_length <= limit,
                'translation_notes': self._get_translation_notes(
                    field,
                    target_language,
                    estimated_length,
                    limit
                )
            }

            if estimated_length > limit:
                warnings.append(
                    f"{field}: Estimated length ({estimated_length}) may exceed limit ({limit}) - "
                    f"condensing may be required"
                )

        return {
            'source_language': source_language,
            'target_language': target_language,
            'platform': platform,
            'localized_fields': localized_metadata,
            'character_multiplier': char_multiplier,
            'warnings': warnings,
            'recommendations': self._generate_translation_recommendations(
                target_language,
                warnings
            )
        }

    def adapt_keywords(
        self,
        source_keywords: List[str],
        source_language: str,
        target_language: str,
        target_market: str
    ) -> Dict[str, Any]:
        """
        Adapt keywords for target market (not just direct translation).

        Args:
            source_keywords: Original keywords
            source_language: Source language code
            target_language: Target language code
            target_market: Target market (e.g., 'France', 'Japan')

        Returns:
            Adapted keyword recommendations
        """
        # Cultural adaptation considerations
        cultural_notes = self._get_cultural_keyword_considerations(target_market)

        # Search behavior differences
        search_patterns = self._get_search_patterns(target_market)

        adapted_keywords = []
        for keyword in source_keywords:
            adapted_keywords.append({
                'source_keyword': keyword,
                'adaptation_strategy': self._determine_adaptation_strategy(
                    keyword,
                    target_market
                ),
                'cultural_considerations': cultural_notes.get(keyword, []),
                'priority': 'high' if keyword in source_keywords[:3] else 'medium'
            })

        return {
            'source_language': source_language,
            'target_language': target_language,
            'target_market': target_market,
            'adapted_keywords': adapted_keywords,
            'search_behavior_notes': search_patterns,
            'recommendations': [
                'Use native speakers for keyword research',
                'Test keywords with local users before finalizing',
                'Consider local competitors\' keyword strategies',
                'Monitor search trends in target market'
            ]
        }

    def validate_translations(
        self,
        translated_metadata: Dict[str, str],
        target_language: str,
        platform: str = 'apple'
    ) -> Dict[str, Any]:
        """
        Validate translated metadata for character limits and quality.

        Args:
            translated_metadata: Translated text fields
            target_language: Target language code
            platform: 'apple' or 'google'

        Returns:
            Validation report
        """
        # Platform limits
        if platform == 'apple':
            limits = {'title': 30, 'subtitle': 30, 'description': 4000, 'keywords': 100}
        else:
            limits = {'title': 50, 'short_description': 80, 'description': 4000}

        validation_results = {
            'is_valid': True,
            'field_validations': {},
            'errors': [],
            'warnings': []
        }

        for field, text in translated_metadata.items():
            if field not in limits:
                continue

            actual_length = len(text)
            limit = limits[field]
            is_within_limit = actual_length <= limit

            validation_results['field_validations'][field] = {
                'text': text,
                'length': actual_length,
                'limit': limit,
                'is_valid': is_within_limit,
                'usage_percentage': round((actual_length / limit) * 100, 1)
            }

            if not is_within_limit:
                validation_results['is_valid'] = False
                validation_results['errors'].append(
                    f"{field} exceeds limit: {actual_length}/{limit} characters"
                )

        # Quality checks
        quality_issues = self._check_translation_quality(
            translated_metadata,
            target_language
        )

        validation_results['quality_checks'] = quality_issues

        if quality_issues:
            validation_results['warnings'].extend(
                [f"Quality issue: {issue}" for issue in quality_issues]
            )

        return validation_results

    def calculate_localization_roi(
        self,
        target_markets: List[str],
        current_monthly_downloads: int,
        localization_cost: float,
        expected_lift_percentage: float = 0.15
    ) -> Dict[str, Any]:
        """
        Estimate ROI of localization investment.

        Args:
            target_markets: List of market codes
            current_monthly_downloads: Current monthly downloads
            localization_cost: Total cost to localize
            expected_lift_percentage: Expected download increase (default 15%)

        Returns:
            ROI analysis
        """
        # Estimate market-specific lift
        market_data = []
        total_expected_lift = 0

        for market_code in target_markets:
            # Find market in priority lists
            market_info = None
            for tier_name, markets in self.PRIORITY_MARKETS.items():
                for m in markets:
                    if m['language'] == market_code:
                        market_info = m
                        break

            if not market_info:
                continue

            # Estimate downloads from this market
            market_downloads = int(current_monthly_downloads * market_info['revenue_share'])
            expected_increase = int(market_downloads * expected_lift_percentage)
            total_expected_lift += expected_increase

            market_data.append({
                'market': market_info['market'],
                'current_monthly_downloads': market_downloads,
                'expected_increase': expected_increase,
                'revenue_potential': market_info['revenue_share']
            })

        # Calculate payback period (assuming $2 revenue per download)
        revenue_per_download = 2.0
        monthly_additional_revenue = total_expected_lift * revenue_per_download
        payback_months = (localization_cost / monthly_additional_revenue) if monthly_additional_revenue > 0 else float('inf')

        return {
            'markets_analyzed': len(market_data),
            'market_breakdown': market_data,
            'total_expected_monthly_lift': total_expected_lift,
            'expected_monthly_revenue_increase': f"${monthly_additional_revenue:,.2f}",
            'localization_cost': f"${localization_cost:,.2f}",
            'payback_period_months': round(payback_months, 1) if payback_months != float('inf') else 'N/A',
            'annual_roi': f"{((monthly_additional_revenue * 12 - localization_cost) / localization_cost * 100):.1f}%" if payback_months != float('inf') else 'Negative',
            'recommendation': self._generate_roi_recommendation(payback_months)
        }

    def _estimate_translation_cost(self, language: str) -> Dict[str, float]:
        """Estimate translation cost for a language."""
        # Base cost per word (professional translation)
        base_cost_per_word = 0.12

        # Language-specific multipliers
        multipliers = {
            'zh-CN': 1.5,  # Chinese requires specialist
            'ja-JP': 1.5,  # Japanese requires specialist
            'ko-KR': 1.3,
            'ar-SA': 1.4,  # Arabic (right-to-left)
            'default': 1.0
        }

        multiplier = multipliers.get(language, multipliers['default'])

        # Typical word counts for app store metadata
        typical_word_counts = {
            'title': 5,
            'subtitle': 5,
            'description': 300,
            'keywords': 20,
            'screenshots': 50  # Caption text
        }

        total_words = sum(typical_word_counts.values())
        estimated_cost = total_words * base_cost_per_word * multiplier

        return {
            'cost_per_word': base_cost_per_word * multiplier,
            'total_words': total_words,
            'estimated_cost': round(estimated_cost, 2)
        }

    def _estimate_total_localization_cost(self, markets: List[Dict[str, Any]]) -> str:
        """Estimate total cost for multiple markets."""
        total = sum(m['estimated_translation_cost']['estimated_cost'] for m in markets)
        return f"${total:,.2f}"

    def _prioritize_implementation(self, markets: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Create phased implementation plan."""
        phases = []

        # Phase 1: Top revenue markets
        phase_1 = [m for m in markets[:3]]
        if phase_1:
            phases.append({
                'phase': 'Phase 1 (First 30 days)',
                'markets': ', '.join([m['market'] for m in phase_1]),
                'rationale': 'Highest revenue potential markets'
            })

        # Phase 2: Remaining tier 1 and top tier 2
        phase_2 = [m for m in markets[3:6]]
        if phase_2:
            phases.append({
                'phase': 'Phase 2 (Days 31-60)',
                'markets': ', '.join([m['market'] for m in phase_2]),
                'rationale': 'Strong revenue markets with good ROI'
            })

        # Phase 3: Remaining markets
        phase_3 = [m for m in markets[6:]]
        if phase_3:
            phases.append({
                'phase': 'Phase 3 (Days 61-90)',
                'markets': ', '.join([m['market'] for m in phase_3]),
                'rationale': 'Complete global coverage'
            })

        return phases

    def _get_translation_notes(
        self,
        field: str,
        target_language: str,
        estimated_length: int,
        limit: int
    ) -> List[str]:
        """Get translation-specific notes for field."""
        notes = []

        if estimated_length > limit:
            notes.append(f"Condensing required - aim for {limit - 10} characters to allow buffer")

        if field == 'title' and target_language.startswith('zh'):
            notes.append("Chinese characters convey more meaning - may need fewer characters")

        if field == 'keywords' and target_language.startswith('de'):
            notes.append("German compound words may be longer - prioritize shorter keywords")

        return notes

    def _generate_translation_recommendations(
        self,
        target_language: str,
        warnings: List[str]
    ) -> List[str]:
        """Generate translation recommendations."""
        recommendations = [
            "Use professional native speakers for translation",
            "Test translations with local users before finalizing"
        ]

        if warnings:
            recommendations.append("Work with translator to condense text while preserving meaning")

        if target_language.startswith('zh') or target_language.startswith('ja'):
            recommendations.append("Consider cultural context and local idioms")

        return recommendations

    def _get_cultural_keyword_considerations(self, target_market: str) -> Dict[str, List[str]]:
        """Get cultural considerations for keywords by market."""
        # Simplified example - real implementation would be more comprehensive
        considerations = {
            'China': ['Avoid politically sensitive terms', 'Consider local alternatives to blocked services'],
            'Japan': ['Honorific language important', 'Technical terms often use katakana'],
            'Germany': ['Privacy and security terms resonate', 'Efficiency and quality valued'],
            'France': ['French language protection laws', 'Prefer French terms over English'],
            'default': ['Research local search behavior', 'Test with native speakers']
        }

        return considerations.get(target_market, considerations['default'])

    def _get_search_patterns(self, target_market: str) -> List[str]:
        """Get search pattern notes for market."""
        patterns = {
            'China': ['Use both simplified characters and romanization', 'Brand names often romanized'],
            'Japan': ['Mix of kanji, hiragana, and katakana', 'English words common in tech'],
            'Germany': ['Compound words common', 'Specific technical terminology'],
            'default': ['Research local search trends', 'Monitor competitor keywords']
        }

        return patterns.get(target_market, patterns['default'])

    def _determine_adaptation_strategy(self, keyword: str, target_market: str) -> str:
        """Determine how to adapt keyword for market."""
        # Simplified logic
        if target_market in ['China', 'Japan', 'Korea']:
            return 'full_localization'  # Complete translation needed
        elif target_market in ['Germany', 'France', 'Spain']:
            return 'adapt_and_translate'  # Some adaptation needed
        else:
            return 'direct_translation'  # Direct translation usually sufficient

    def _check_translation_quality(
        self,
        translated_metadata: Dict[str, str],
        target_language: str
    ) -> List[str]:
        """Basic quality checks for translations."""
        issues = []

        # Check for untranslated placeholders
        for field, text in translated_metadata.items():
            if '[' in text or '{' in text or 'TODO' in text.upper():
                issues.append(f"{field} contains placeholder text")

        # Check for excessive punctuation
        for field, text in translated_metadata.items():
            if text.count('!') > 3:
                issues.append(f"{field} has excessive exclamation marks")

        return issues

    def _generate_roi_recommendation(self, payback_months: float) -> str:
        """Generate ROI recommendation."""
        if payback_months <= 3:
            return "Excellent ROI - proceed immediately"
        elif payback_months <= 6:
            return "Good ROI - recommended investment"
        elif payback_months <= 12:
            return "Moderate ROI - consider if strategic market"
        else:
            return "Low ROI - reconsider or focus on higher-priority markets first"


def plan_localization_strategy(
    current_market: str,
    budget_level: str,
    monthly_downloads: int
) -> Dict[str, Any]:
    """
    Convenience function to plan localization strategy.

    Args:
        current_market: Current market code
        budget_level: Budget level
        monthly_downloads: Current monthly downloads

    Returns:
        Complete localization plan
    """
    helper = LocalizationHelper()

    target_markets = helper.identify_target_markets(
        current_market=current_market,
        budget_level=budget_level
    )

    # Extract market codes
    market_codes = [m['language'] for m in target_markets['recommended_markets']]

    # Calculate ROI
    estimated_cost = float(target_markets['estimated_cost'].replace('$', '').replace(',', ''))

    roi_analysis = helper.calculate_localization_roi(
        market_codes,
        monthly_downloads,
        estimated_cost
    )

    return {
        'target_markets': target_markets,
        'roi_analysis': roi_analysis
    }
