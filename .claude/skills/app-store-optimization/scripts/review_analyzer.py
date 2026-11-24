"""
Review analysis module for App Store Optimization.
Analyzes user reviews for sentiment, issues, and feature requests.
"""

from typing import Dict, List, Any, Optional, Tuple
from collections import Counter
import re


class ReviewAnalyzer:
    """Analyzes user reviews for actionable insights."""

    # Sentiment keywords
    POSITIVE_KEYWORDS = [
        'great', 'awesome', 'excellent', 'amazing', 'love', 'best', 'perfect',
        'fantastic', 'wonderful', 'brilliant', 'outstanding', 'superb'
    ]

    NEGATIVE_KEYWORDS = [
        'bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'useless',
        'broken', 'crash', 'bug', 'slow', 'disappointing', 'frustrating'
    ]

    # Issue indicators
    ISSUE_KEYWORDS = [
        'crash', 'bug', 'error', 'broken', 'not working', 'doesnt work',
        'freezes', 'slow', 'laggy', 'glitch', 'problem', 'issue', 'fail'
    ]

    # Feature request indicators
    FEATURE_REQUEST_KEYWORDS = [
        'wish', 'would be nice', 'should add', 'need', 'want', 'hope',
        'please add', 'missing', 'lacks', 'feature request'
    ]

    def __init__(self, app_name: str):
        """
        Initialize review analyzer.

        Args:
            app_name: Name of the app
        """
        self.app_name = app_name
        self.reviews = []
        self.analysis_cache = {}

    def analyze_sentiment(
        self,
        reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze sentiment across reviews.

        Args:
            reviews: List of review dicts with 'text', 'rating', 'date'

        Returns:
            Sentiment analysis summary
        """
        self.reviews = reviews

        sentiment_counts = {
            'positive': 0,
            'neutral': 0,
            'negative': 0
        }

        detailed_sentiments = []

        for review in reviews:
            text = review.get('text', '').lower()
            rating = review.get('rating', 3)

            # Calculate sentiment score
            sentiment_score = self._calculate_sentiment_score(text, rating)
            sentiment_category = self._categorize_sentiment(sentiment_score)

            sentiment_counts[sentiment_category] += 1

            detailed_sentiments.append({
                'review_id': review.get('id', ''),
                'rating': rating,
                'sentiment_score': sentiment_score,
                'sentiment': sentiment_category,
                'text_preview': text[:100] + '...' if len(text) > 100 else text
            })

        # Calculate percentages
        total = len(reviews)
        sentiment_distribution = {
            'positive': round((sentiment_counts['positive'] / total) * 100, 1) if total > 0 else 0,
            'neutral': round((sentiment_counts['neutral'] / total) * 100, 1) if total > 0 else 0,
            'negative': round((sentiment_counts['negative'] / total) * 100, 1) if total > 0 else 0
        }

        # Calculate average rating
        avg_rating = sum(r.get('rating', 0) for r in reviews) / total if total > 0 else 0

        return {
            'total_reviews_analyzed': total,
            'average_rating': round(avg_rating, 2),
            'sentiment_distribution': sentiment_distribution,
            'sentiment_counts': sentiment_counts,
            'sentiment_trend': self._assess_sentiment_trend(sentiment_distribution),
            'detailed_sentiments': detailed_sentiments[:50]  # Limit output
        }

    def extract_common_themes(
        self,
        reviews: List[Dict[str, Any]],
        min_mentions: int = 3
    ) -> Dict[str, Any]:
        """
        Extract frequently mentioned themes and topics.

        Args:
            reviews: List of review dicts
            min_mentions: Minimum mentions to be considered common

        Returns:
            Common themes analysis
        """
        # Extract all words from reviews
        all_words = []
        all_phrases = []

        for review in reviews:
            text = review.get('text', '').lower()
            # Clean text
            text = re.sub(r'[^\w\s]', ' ', text)
            words = text.split()

            # Filter out common words
            stop_words = {
                'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have',
                'app', 'apps', 'very', 'really', 'just', 'but', 'not', 'you'
            }
            words = [w for w in words if w not in stop_words and len(w) > 3]

            all_words.extend(words)

            # Extract 2-3 word phrases
            for i in range(len(words) - 1):
                phrase = f"{words[i]} {words[i+1]}"
                all_phrases.append(phrase)

        # Count frequency
        word_freq = Counter(all_words)
        phrase_freq = Counter(all_phrases)

        # Filter by min_mentions
        common_words = [
            {'word': word, 'mentions': count}
            for word, count in word_freq.most_common(30)
            if count >= min_mentions
        ]

        common_phrases = [
            {'phrase': phrase, 'mentions': count}
            for phrase, count in phrase_freq.most_common(20)
            if count >= min_mentions
        ]

        # Categorize themes
        themes = self._categorize_themes(common_words, common_phrases)

        return {
            'common_words': common_words,
            'common_phrases': common_phrases,
            'identified_themes': themes,
            'insights': self._generate_theme_insights(themes)
        }

    def identify_issues(
        self,
        reviews: List[Dict[str, Any]],
        rating_threshold: int = 3
    ) -> Dict[str, Any]:
        """
        Identify bugs, crashes, and other issues from reviews.

        Args:
            reviews: List of review dicts
            rating_threshold: Only analyze reviews at or below this rating

        Returns:
            Issue identification report
        """
        issues = []

        for review in reviews:
            rating = review.get('rating', 5)
            if rating > rating_threshold:
                continue

            text = review.get('text', '').lower()

            # Check for issue keywords
            mentioned_issues = []
            for keyword in self.ISSUE_KEYWORDS:
                if keyword in text:
                    mentioned_issues.append(keyword)

            if mentioned_issues:
                issues.append({
                    'review_id': review.get('id', ''),
                    'rating': rating,
                    'date': review.get('date', ''),
                    'issue_keywords': mentioned_issues,
                    'text': text[:200] + '...' if len(text) > 200 else text
                })

        # Group by issue type
        issue_frequency = Counter()
        for issue in issues:
            for keyword in issue['issue_keywords']:
                issue_frequency[keyword] += 1

        # Categorize issues
        categorized_issues = self._categorize_issues(issues)

        # Calculate issue severity
        severity_scores = self._calculate_issue_severity(
            categorized_issues,
            len(reviews)
        )

        return {
            'total_issues_found': len(issues),
            'issue_frequency': dict(issue_frequency.most_common(15)),
            'categorized_issues': categorized_issues,
            'severity_scores': severity_scores,
            'top_issues': self._rank_issues_by_severity(severity_scores),
            'recommendations': self._generate_issue_recommendations(
                categorized_issues,
                severity_scores
            )
        }

    def find_feature_requests(
        self,
        reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Extract feature requests and desired improvements.

        Args:
            reviews: List of review dicts

        Returns:
            Feature request analysis
        """
        feature_requests = []

        for review in reviews:
            text = review.get('text', '').lower()
            rating = review.get('rating', 3)

            # Check for feature request indicators
            is_feature_request = any(
                keyword in text
                for keyword in self.FEATURE_REQUEST_KEYWORDS
            )

            if is_feature_request:
                # Extract the specific request
                request_text = self._extract_feature_request_text(text)

                feature_requests.append({
                    'review_id': review.get('id', ''),
                    'rating': rating,
                    'date': review.get('date', ''),
                    'request_text': request_text,
                    'full_review': text[:200] + '...' if len(text) > 200 else text
                })

        # Cluster similar requests
        clustered_requests = self._cluster_feature_requests(feature_requests)

        # Prioritize based on frequency and rating context
        prioritized_requests = self._prioritize_feature_requests(clustered_requests)

        return {
            'total_feature_requests': len(feature_requests),
            'clustered_requests': clustered_requests,
            'prioritized_requests': prioritized_requests,
            'implementation_recommendations': self._generate_feature_recommendations(
                prioritized_requests
            )
        }

    def track_sentiment_trends(
        self,
        reviews_by_period: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Track sentiment changes over time.

        Args:
            reviews_by_period: Dict of period_name: reviews

        Returns:
            Trend analysis
        """
        trends = []

        for period, reviews in reviews_by_period.items():
            sentiment = self.analyze_sentiment(reviews)

            trends.append({
                'period': period,
                'total_reviews': len(reviews),
                'average_rating': sentiment['average_rating'],
                'positive_percentage': sentiment['sentiment_distribution']['positive'],
                'negative_percentage': sentiment['sentiment_distribution']['negative']
            })

        # Calculate trend direction
        if len(trends) >= 2:
            first_period = trends[0]
            last_period = trends[-1]

            rating_change = last_period['average_rating'] - first_period['average_rating']
            sentiment_change = last_period['positive_percentage'] - first_period['positive_percentage']

            trend_direction = self._determine_trend_direction(
                rating_change,
                sentiment_change
            )
        else:
            trend_direction = 'insufficient_data'

        return {
            'periods_analyzed': len(trends),
            'trend_data': trends,
            'trend_direction': trend_direction,
            'insights': self._generate_trend_insights(trends, trend_direction)
        }

    def generate_response_templates(
        self,
        issue_category: str
    ) -> List[Dict[str, str]]:
        """
        Generate response templates for common review scenarios.

        Args:
            issue_category: Category of issue ('crash', 'feature_request', 'positive', etc.)

        Returns:
            Response templates
        """
        templates = {
            'crash': [
                {
                    'scenario': 'App crash reported',
                    'template': "Thank you for bringing this to our attention. We're sorry you experienced a crash. "
                               "Our team is investigating this issue. Could you please share more details about when "
                               "this occurred (device model, iOS/Android version) by contacting support@[company].com? "
                               "We're committed to fixing this quickly."
                },
                {
                    'scenario': 'Crash already fixed',
                    'template': "Thank you for your feedback. We've identified and fixed this crash issue in version [X.X]. "
                               "Please update to the latest version. If the problem persists, please reach out to "
                               "support@[company].com and we'll help you directly."
                }
            ],
            'bug': [
                {
                    'scenario': 'Bug reported',
                    'template': "Thanks for reporting this bug. We take these issues seriously. Our team is looking into it "
                               "and we'll have a fix in an upcoming update. We appreciate your patience and will notify you "
                               "when it's resolved."
                }
            ],
            'feature_request': [
                {
                    'scenario': 'Feature request received',
                    'template': "Thank you for this suggestion! We're always looking to improve [app_name]. We've added your "
                               "request to our roadmap and will consider it for a future update. Follow us @[social] for "
                               "updates on new features."
                },
                {
                    'scenario': 'Feature already planned',
                    'template': "Great news! This feature is already on our roadmap and we're working on it. Stay tuned for "
                               "updates in the coming months. Thanks for your feedback!"
                }
            ],
            'positive': [
                {
                    'scenario': 'Positive review',
                    'template': "Thank you so much for your kind words! We're thrilled that you're enjoying [app_name]. "
                               "Reviews like yours motivate our team to keep improving. If you ever have suggestions, "
                               "we'd love to hear them!"
                }
            ],
            'negative_general': [
                {
                    'scenario': 'General complaint',
                    'template': "We're sorry to hear you're not satisfied with your experience. We'd like to make this right. "
                               "Please contact us at support@[company].com so we can understand the issue better and help "
                               "you directly. Thank you for giving us a chance to improve."
                }
            ]
        }

        return templates.get(issue_category, templates['negative_general'])

    def _calculate_sentiment_score(self, text: str, rating: int) -> float:
        """Calculate sentiment score (-1 to 1)."""
        # Start with rating-based score
        rating_score = (rating - 3) / 2  # Convert 1-5 to -1 to 1

        # Adjust based on text sentiment
        positive_count = sum(1 for keyword in self.POSITIVE_KEYWORDS if keyword in text)
        negative_count = sum(1 for keyword in self.NEGATIVE_KEYWORDS if keyword in text)

        text_score = (positive_count - negative_count) / 10  # Normalize

        # Weighted average (60% rating, 40% text)
        final_score = (rating_score * 0.6) + (text_score * 0.4)

        return max(min(final_score, 1.0), -1.0)

    def _categorize_sentiment(self, score: float) -> str:
        """Categorize sentiment score."""
        if score > 0.3:
            return 'positive'
        elif score < -0.3:
            return 'negative'
        else:
            return 'neutral'

    def _assess_sentiment_trend(self, distribution: Dict[str, float]) -> str:
        """Assess overall sentiment trend."""
        positive = distribution['positive']
        negative = distribution['negative']

        if positive > 70:
            return 'very_positive'
        elif positive > 50:
            return 'positive'
        elif negative > 30:
            return 'concerning'
        elif negative > 50:
            return 'critical'
        else:
            return 'mixed'

    def _categorize_themes(
        self,
        common_words: List[Dict[str, Any]],
        common_phrases: List[Dict[str, Any]]
    ) -> Dict[str, List[str]]:
        """Categorize themes from words and phrases."""
        themes = {
            'features': [],
            'performance': [],
            'usability': [],
            'support': [],
            'pricing': []
        }

        # Keywords for each category
        feature_keywords = {'feature', 'functionality', 'option', 'tool'}
        performance_keywords = {'fast', 'slow', 'crash', 'lag', 'speed', 'performance'}
        usability_keywords = {'easy', 'difficult', 'intuitive', 'confusing', 'interface', 'design'}
        support_keywords = {'support', 'help', 'customer', 'service', 'response'}
        pricing_keywords = {'price', 'cost', 'expensive', 'cheap', 'subscription', 'free'}

        for word_data in common_words:
            word = word_data['word']
            if any(kw in word for kw in feature_keywords):
                themes['features'].append(word)
            elif any(kw in word for kw in performance_keywords):
                themes['performance'].append(word)
            elif any(kw in word for kw in usability_keywords):
                themes['usability'].append(word)
            elif any(kw in word for kw in support_keywords):
                themes['support'].append(word)
            elif any(kw in word for kw in pricing_keywords):
                themes['pricing'].append(word)

        return {k: v for k, v in themes.items() if v}  # Remove empty categories

    def _generate_theme_insights(self, themes: Dict[str, List[str]]) -> List[str]:
        """Generate insights from themes."""
        insights = []

        for category, keywords in themes.items():
            if keywords:
                insights.append(
                    f"{category.title()}: Users frequently mention {', '.join(keywords[:3])}"
                )

        return insights[:5]

    def _categorize_issues(self, issues: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Categorize issues by type."""
        categories = {
            'crashes': [],
            'bugs': [],
            'performance': [],
            'compatibility': []
        }

        for issue in issues:
            keywords = issue['issue_keywords']

            if 'crash' in keywords or 'freezes' in keywords:
                categories['crashes'].append(issue)
            elif 'bug' in keywords or 'error' in keywords or 'broken' in keywords:
                categories['bugs'].append(issue)
            elif 'slow' in keywords or 'laggy' in keywords:
                categories['performance'].append(issue)
            else:
                categories['compatibility'].append(issue)

        return {k: v for k, v in categories.items() if v}

    def _calculate_issue_severity(
        self,
        categorized_issues: Dict[str, List[Dict[str, Any]]],
        total_reviews: int
    ) -> Dict[str, Dict[str, Any]]:
        """Calculate severity scores for each issue category."""
        severity_scores = {}

        for category, issues in categorized_issues.items():
            count = len(issues)
            percentage = (count / total_reviews) * 100 if total_reviews > 0 else 0

            # Calculate average rating of affected reviews
            avg_rating = sum(i['rating'] for i in issues) / count if count > 0 else 0

            # Severity score (0-100)
            severity = min((percentage * 10) + ((5 - avg_rating) * 10), 100)

            severity_scores[category] = {
                'count': count,
                'percentage': round(percentage, 2),
                'average_rating': round(avg_rating, 2),
                'severity_score': round(severity, 1),
                'priority': 'critical' if severity > 70 else ('high' if severity > 40 else 'medium')
            }

        return severity_scores

    def _rank_issues_by_severity(
        self,
        severity_scores: Dict[str, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Rank issues by severity score."""
        ranked = sorted(
            [{'category': cat, **data} for cat, data in severity_scores.items()],
            key=lambda x: x['severity_score'],
            reverse=True
        )
        return ranked

    def _generate_issue_recommendations(
        self,
        categorized_issues: Dict[str, List[Dict[str, Any]]],
        severity_scores: Dict[str, Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations for addressing issues."""
        recommendations = []

        for category, score_data in severity_scores.items():
            if score_data['priority'] == 'critical':
                recommendations.append(
                    f"URGENT: Address {category} issues immediately - affecting {score_data['percentage']}% of reviews"
                )
            elif score_data['priority'] == 'high':
                recommendations.append(
                    f"HIGH PRIORITY: Focus on {category} issues in next update"
                )

        return recommendations

    def _extract_feature_request_text(self, text: str) -> str:
        """Extract the specific feature request from review text."""
        # Simple extraction - find sentence with feature request keywords
        sentences = text.split('.')
        for sentence in sentences:
            if any(keyword in sentence for keyword in self.FEATURE_REQUEST_KEYWORDS):
                return sentence.strip()
        return text[:100]  # Fallback

    def _cluster_feature_requests(
        self,
        feature_requests: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Cluster similar feature requests."""
        # Simplified clustering - group by common keywords
        clusters = {}

        for request in feature_requests:
            text = request['request_text'].lower()
            # Extract key words
            words = [w for w in text.split() if len(w) > 4]

            # Try to find matching cluster
            matched = False
            for cluster_key in clusters:
                if any(word in cluster_key for word in words[:3]):
                    clusters[cluster_key].append(request)
                    matched = True
                    break

            if not matched and words:
                cluster_key = ' '.join(words[:2])
                clusters[cluster_key] = [request]

        return [
            {'feature_theme': theme, 'request_count': len(requests), 'examples': requests[:3]}
            for theme, requests in clusters.items()
        ]

    def _prioritize_feature_requests(
        self,
        clustered_requests: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Prioritize feature requests by frequency."""
        return sorted(
            clustered_requests,
            key=lambda x: x['request_count'],
            reverse=True
        )[:10]

    def _generate_feature_recommendations(
        self,
        prioritized_requests: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations for feature requests."""
        recommendations = []

        if prioritized_requests:
            top_request = prioritized_requests[0]
            recommendations.append(
                f"Most requested feature: {top_request['feature_theme']} "
                f"({top_request['request_count']} mentions) - consider for next major release"
            )

        if len(prioritized_requests) > 1:
            recommendations.append(
                f"Also consider: {prioritized_requests[1]['feature_theme']}"
            )

        return recommendations

    def _determine_trend_direction(
        self,
        rating_change: float,
        sentiment_change: float
    ) -> str:
        """Determine overall trend direction."""
        if rating_change > 0.2 and sentiment_change > 5:
            return 'improving'
        elif rating_change < -0.2 and sentiment_change < -5:
            return 'declining'
        else:
            return 'stable'

    def _generate_trend_insights(
        self,
        trends: List[Dict[str, Any]],
        trend_direction: str
    ) -> List[str]:
        """Generate insights from trend analysis."""
        insights = []

        if trend_direction == 'improving':
            insights.append("Positive trend: User satisfaction is increasing over time")
        elif trend_direction == 'declining':
            insights.append("WARNING: User satisfaction is declining - immediate action needed")
        else:
            insights.append("Sentiment is stable - maintain current quality")

        # Review velocity insight
        if len(trends) >= 2:
            recent_reviews = trends[-1]['total_reviews']
            previous_reviews = trends[-2]['total_reviews']

            if recent_reviews > previous_reviews * 1.5:
                insights.append("Review volume increasing - growing user base or recent controversy")

        return insights


def analyze_reviews(
    app_name: str,
    reviews: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Convenience function to perform comprehensive review analysis.

    Args:
        app_name: App name
        reviews: List of review dictionaries

    Returns:
        Complete review analysis
    """
    analyzer = ReviewAnalyzer(app_name)

    return {
        'sentiment_analysis': analyzer.analyze_sentiment(reviews),
        'common_themes': analyzer.extract_common_themes(reviews),
        'issues_identified': analyzer.identify_issues(reviews),
        'feature_requests': analyzer.find_feature_requests(reviews)
    }
