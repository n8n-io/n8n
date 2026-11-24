"""
Metadata optimization module for App Store Optimization.
Optimizes titles, descriptions, and keyword fields with platform-specific character limit validation.
"""

from typing import Dict, List, Any, Optional, Tuple
import re


class MetadataOptimizer:
    """Optimizes app store metadata for maximum discoverability and conversion."""

    # Platform-specific character limits
    CHAR_LIMITS = {
        'apple': {
            'title': 30,
            'subtitle': 30,
            'promotional_text': 170,
            'description': 4000,
            'keywords': 100,
            'whats_new': 4000
        },
        'google': {
            'title': 50,
            'short_description': 80,
            'full_description': 4000
        }
    }

    def __init__(self, platform: str = 'apple'):
        """
        Initialize metadata optimizer.

        Args:
            platform: 'apple' or 'google'
        """
        if platform not in ['apple', 'google']:
            raise ValueError("Platform must be 'apple' or 'google'")

        self.platform = platform
        self.limits = self.CHAR_LIMITS[platform]

    def optimize_title(
        self,
        app_name: str,
        target_keywords: List[str],
        include_brand: bool = True
    ) -> Dict[str, Any]:
        """
        Optimize app title with keyword integration.

        Args:
            app_name: Your app's brand name
            target_keywords: List of keywords to potentially include
            include_brand: Whether to include brand name

        Returns:
            Optimized title options with analysis
        """
        max_length = self.limits['title']

        title_options = []

        # Option 1: Brand name only
        if include_brand:
            option1 = app_name[:max_length]
            title_options.append({
                'title': option1,
                'length': len(option1),
                'remaining_chars': max_length - len(option1),
                'keywords_included': [],
                'strategy': 'brand_only',
                'pros': ['Maximum brand recognition', 'Clean and simple'],
                'cons': ['No keyword targeting', 'Lower discoverability']
            })

        # Option 2: Brand + Primary Keyword
        if target_keywords:
            primary_keyword = target_keywords[0]
            option2 = self._build_title_with_keywords(
                app_name,
                [primary_keyword],
                max_length
            )
            if option2:
                title_options.append({
                    'title': option2,
                    'length': len(option2),
                    'remaining_chars': max_length - len(option2),
                    'keywords_included': [primary_keyword],
                    'strategy': 'brand_plus_primary',
                    'pros': ['Targets main keyword', 'Maintains brand identity'],
                    'cons': ['Limited keyword coverage']
                })

        # Option 3: Brand + Multiple Keywords (if space allows)
        if len(target_keywords) > 1:
            option3 = self._build_title_with_keywords(
                app_name,
                target_keywords[:2],
                max_length
            )
            if option3:
                title_options.append({
                    'title': option3,
                    'length': len(option3),
                    'remaining_chars': max_length - len(option3),
                    'keywords_included': target_keywords[:2],
                    'strategy': 'brand_plus_multiple',
                    'pros': ['Multiple keyword targets', 'Better discoverability'],
                    'cons': ['May feel cluttered', 'Less brand focus']
                })

        # Option 4: Keyword-first approach (for new apps)
        if target_keywords and not include_brand:
            option4 = " ".join(target_keywords[:2])[:max_length]
            title_options.append({
                'title': option4,
                'length': len(option4),
                'remaining_chars': max_length - len(option4),
                'keywords_included': target_keywords[:2],
                'strategy': 'keyword_first',
                'pros': ['Maximum SEO benefit', 'Clear functionality'],
                'cons': ['No brand recognition', 'Generic appearance']
            })

        return {
            'platform': self.platform,
            'max_length': max_length,
            'options': title_options,
            'recommendation': self._recommend_title_option(title_options)
        }

    def optimize_description(
        self,
        app_info: Dict[str, Any],
        target_keywords: List[str],
        description_type: str = 'full'
    ) -> Dict[str, Any]:
        """
        Optimize app description with keyword integration and conversion focus.

        Args:
            app_info: Dict with 'name', 'key_features', 'unique_value', 'target_audience'
            target_keywords: List of keywords to integrate naturally
            description_type: 'full', 'short' (Google), 'subtitle' (Apple)

        Returns:
            Optimized description with analysis
        """
        if description_type == 'short' and self.platform == 'google':
            return self._optimize_short_description(app_info, target_keywords)
        elif description_type == 'subtitle' and self.platform == 'apple':
            return self._optimize_subtitle(app_info, target_keywords)
        else:
            return self._optimize_full_description(app_info, target_keywords)

    def optimize_keyword_field(
        self,
        target_keywords: List[str],
        app_title: str = "",
        app_description: str = ""
    ) -> Dict[str, Any]:
        """
        Optimize Apple's 100-character keyword field.

        Rules:
        - No spaces between commas
        - No plural forms if singular exists
        - No duplicates
        - Keywords in title/subtitle are already indexed

        Args:
            target_keywords: List of target keywords
            app_title: Current app title (to avoid duplication)
            app_description: Current description (to check coverage)

        Returns:
            Optimized keyword field (comma-separated, no spaces)
        """
        if self.platform != 'apple':
            return {'error': 'Keyword field optimization only applies to Apple App Store'}

        max_length = self.limits['keywords']

        # Extract words already in title (these don't need to be in keyword field)
        title_words = set(app_title.lower().split()) if app_title else set()

        # Process keywords
        processed_keywords = []
        for keyword in target_keywords:
            keyword_lower = keyword.lower().strip()

            # Skip if already in title
            if keyword_lower in title_words:
                continue

            # Remove duplicates and process
            words = keyword_lower.split()
            for word in words:
                if word not in processed_keywords and word not in title_words:
                    processed_keywords.append(word)

        # Remove plurals if singular exists
        deduplicated = self._remove_plural_duplicates(processed_keywords)

        # Build keyword field within 100 character limit
        keyword_field = self._build_keyword_field(deduplicated, max_length)

        # Calculate keyword density in description
        density = self._calculate_coverage(target_keywords, app_description)

        return {
            'keyword_field': keyword_field,
            'length': len(keyword_field),
            'remaining_chars': max_length - len(keyword_field),
            'keywords_included': keyword_field.split(','),
            'keywords_count': len(keyword_field.split(',')),
            'keywords_excluded': [kw for kw in target_keywords if kw.lower() not in keyword_field],
            'description_coverage': density,
            'optimization_tips': [
                'Keywords in title are auto-indexed - no need to repeat',
                'Use singular forms only (Apple indexes plurals automatically)',
                'No spaces between commas to maximize character usage',
                'Update keyword field with each app update to test variations'
            ]
        }

    def validate_character_limits(
        self,
        metadata: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Validate all metadata fields against platform character limits.

        Args:
            metadata: Dictionary of field_name: value

        Returns:
            Validation report with errors and warnings
        """
        validation_results = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'field_status': {}
        }

        for field_name, value in metadata.items():
            if field_name not in self.limits:
                validation_results['warnings'].append(
                    f"Unknown field '{field_name}' for {self.platform} platform"
                )
                continue

            max_length = self.limits[field_name]
            actual_length = len(value)
            remaining = max_length - actual_length

            field_status = {
                'value': value,
                'length': actual_length,
                'limit': max_length,
                'remaining': remaining,
                'is_valid': actual_length <= max_length,
                'usage_percentage': round((actual_length / max_length) * 100, 1)
            }

            validation_results['field_status'][field_name] = field_status

            if actual_length > max_length:
                validation_results['is_valid'] = False
                validation_results['errors'].append(
                    f"'{field_name}' exceeds limit: {actual_length}/{max_length} chars"
                )
            elif remaining > max_length * 0.2:  # More than 20% unused
                validation_results['warnings'].append(
                    f"'{field_name}' under-utilizes space: {remaining} chars remaining"
                )

        return validation_results

    def calculate_keyword_density(
        self,
        text: str,
        target_keywords: List[str]
    ) -> Dict[str, Any]:
        """
        Calculate keyword density in text.

        Args:
            text: Text to analyze
            target_keywords: Keywords to check

        Returns:
            Density analysis
        """
        text_lower = text.lower()
        total_words = len(text_lower.split())

        keyword_densities = {}
        for keyword in target_keywords:
            keyword_lower = keyword.lower()
            count = text_lower.count(keyword_lower)
            density = (count / total_words * 100) if total_words > 0 else 0

            keyword_densities[keyword] = {
                'occurrences': count,
                'density_percentage': round(density, 2),
                'status': self._assess_density(density)
            }

        # Overall assessment
        total_keyword_occurrences = sum(kw['occurrences'] for kw in keyword_densities.values())
        overall_density = (total_keyword_occurrences / total_words * 100) if total_words > 0 else 0

        return {
            'total_words': total_words,
            'keyword_densities': keyword_densities,
            'overall_keyword_density': round(overall_density, 2),
            'assessment': self._assess_overall_density(overall_density),
            'recommendations': self._generate_density_recommendations(keyword_densities)
        }

    def _build_title_with_keywords(
        self,
        app_name: str,
        keywords: List[str],
        max_length: int
    ) -> Optional[str]:
        """Build title combining app name and keywords within limit."""
        separators = [' - ', ': ', ' | ']

        for sep in separators:
            for kw in keywords:
                title = f"{app_name}{sep}{kw}"
                if len(title) <= max_length:
                    return title

        return None

    def _optimize_short_description(
        self,
        app_info: Dict[str, Any],
        target_keywords: List[str]
    ) -> Dict[str, Any]:
        """Optimize Google Play short description (80 chars)."""
        max_length = self.limits['short_description']

        # Focus on unique value proposition with primary keyword
        unique_value = app_info.get('unique_value', '')
        primary_keyword = target_keywords[0] if target_keywords else ''

        # Template: [Primary Keyword] - [Unique Value]
        short_desc = f"{primary_keyword.title()} - {unique_value}"[:max_length]

        return {
            'short_description': short_desc,
            'length': len(short_desc),
            'remaining_chars': max_length - len(short_desc),
            'keywords_included': [primary_keyword] if primary_keyword in short_desc.lower() else [],
            'strategy': 'keyword_value_proposition'
        }

    def _optimize_subtitle(
        self,
        app_info: Dict[str, Any],
        target_keywords: List[str]
    ) -> Dict[str, Any]:
        """Optimize Apple App Store subtitle (30 chars)."""
        max_length = self.limits['subtitle']

        # Very concise - primary keyword or key feature
        primary_keyword = target_keywords[0] if target_keywords else ''
        key_feature = app_info.get('key_features', [''])[0] if app_info.get('key_features') else ''

        options = [
            primary_keyword[:max_length],
            key_feature[:max_length],
            f"{primary_keyword} App"[:max_length]
        ]

        return {
            'subtitle_options': [opt for opt in options if opt],
            'max_length': max_length,
            'recommendation': options[0] if options else ''
        }

    def _optimize_full_description(
        self,
        app_info: Dict[str, Any],
        target_keywords: List[str]
    ) -> Dict[str, Any]:
        """Optimize full app description (4000 chars for both platforms)."""
        max_length = self.limits.get('description', self.limits.get('full_description', 4000))

        # Structure: Hook → Features → Benefits → Social Proof → CTA
        sections = []

        # Hook (with primary keyword)
        primary_keyword = target_keywords[0] if target_keywords else ''
        unique_value = app_info.get('unique_value', '')
        hook = f"{unique_value} {primary_keyword.title()} that helps you achieve more.\n\n"
        sections.append(hook)

        # Features (with keywords naturally integrated)
        features = app_info.get('key_features', [])
        if features:
            sections.append("KEY FEATURES:\n")
            for i, feature in enumerate(features[:5], 1):
                # Integrate keywords naturally
                feature_text = f"• {feature}"
                if i <= len(target_keywords):
                    keyword = target_keywords[i-1]
                    if keyword.lower() not in feature.lower():
                        feature_text = f"• {feature} with {keyword}"
                sections.append(f"{feature_text}\n")
            sections.append("\n")

        # Benefits
        target_audience = app_info.get('target_audience', 'users')
        sections.append(f"PERFECT FOR:\n{target_audience}\n\n")

        # Social proof placeholder
        sections.append("WHY USERS LOVE US:\n")
        sections.append("Join thousands of satisfied users who have transformed their workflow.\n\n")

        # CTA
        sections.append("Download now and start experiencing the difference!")

        # Combine and validate length
        full_description = "".join(sections)
        if len(full_description) > max_length:
            full_description = full_description[:max_length-3] + "..."

        # Calculate keyword density
        density = self.calculate_keyword_density(full_description, target_keywords)

        return {
            'full_description': full_description,
            'length': len(full_description),
            'remaining_chars': max_length - len(full_description),
            'keyword_analysis': density,
            'structure': {
                'has_hook': True,
                'has_features': len(features) > 0,
                'has_benefits': True,
                'has_cta': True
            }
        }

    def _remove_plural_duplicates(self, keywords: List[str]) -> List[str]:
        """Remove plural forms if singular exists."""
        deduplicated = []
        singular_set = set()

        for keyword in keywords:
            if keyword.endswith('s') and len(keyword) > 1:
                singular = keyword[:-1]
                if singular not in singular_set:
                    deduplicated.append(singular)
                    singular_set.add(singular)
            else:
                if keyword not in singular_set:
                    deduplicated.append(keyword)
                    singular_set.add(keyword)

        return deduplicated

    def _build_keyword_field(self, keywords: List[str], max_length: int) -> str:
        """Build comma-separated keyword field within character limit."""
        keyword_field = ""

        for keyword in keywords:
            test_field = f"{keyword_field},{keyword}" if keyword_field else keyword
            if len(test_field) <= max_length:
                keyword_field = test_field
            else:
                break

        return keyword_field

    def _calculate_coverage(self, keywords: List[str], text: str) -> Dict[str, int]:
        """Calculate how many keywords are covered in text."""
        text_lower = text.lower()
        coverage = {}

        for keyword in keywords:
            coverage[keyword] = text_lower.count(keyword.lower())

        return coverage

    def _assess_density(self, density: float) -> str:
        """Assess individual keyword density."""
        if density < 0.5:
            return "too_low"
        elif density <= 2.5:
            return "optimal"
        else:
            return "too_high"

    def _assess_overall_density(self, density: float) -> str:
        """Assess overall keyword density."""
        if density < 2:
            return "Under-optimized: Consider adding more keyword variations"
        elif density <= 5:
            return "Optimal: Good keyword integration without stuffing"
        elif density <= 8:
            return "High: Approaching keyword stuffing - reduce keyword usage"
        else:
            return "Too High: Keyword stuffing detected - rewrite for natural flow"

    def _generate_density_recommendations(
        self,
        keyword_densities: Dict[str, Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations based on keyword density analysis."""
        recommendations = []

        for keyword, data in keyword_densities.items():
            if data['status'] == 'too_low':
                recommendations.append(
                    f"Increase usage of '{keyword}' - currently only {data['occurrences']} times"
                )
            elif data['status'] == 'too_high':
                recommendations.append(
                    f"Reduce usage of '{keyword}' - appears {data['occurrences']} times (keyword stuffing risk)"
                )

        if not recommendations:
            recommendations.append("Keyword density is well-balanced")

        return recommendations

    def _recommend_title_option(self, options: List[Dict[str, Any]]) -> str:
        """Recommend best title option based on strategy."""
        if not options:
            return "No valid options available"

        # Prefer brand_plus_primary for established apps
        for option in options:
            if option['strategy'] == 'brand_plus_primary':
                return f"Recommended: '{option['title']}' (Balance of brand and SEO)"

        # Fallback to first option
        return f"Recommended: '{options[0]['title']}' ({options[0]['strategy']})"


def optimize_app_metadata(
    platform: str,
    app_info: Dict[str, Any],
    target_keywords: List[str]
) -> Dict[str, Any]:
    """
    Convenience function to optimize all metadata fields.

    Args:
        platform: 'apple' or 'google'
        app_info: App information dictionary
        target_keywords: Target keywords list

    Returns:
        Complete metadata optimization package
    """
    optimizer = MetadataOptimizer(platform)

    return {
        'platform': platform,
        'title': optimizer.optimize_title(
            app_info['name'],
            target_keywords
        ),
        'description': optimizer.optimize_description(
            app_info,
            target_keywords,
            'full'
        ),
        'keyword_field': optimizer.optimize_keyword_field(
            target_keywords
        ) if platform == 'apple' else None
    }
