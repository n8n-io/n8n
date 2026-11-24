"""
Launch checklist module for App Store Optimization.
Generates comprehensive pre-launch and update checklists.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta


class LaunchChecklistGenerator:
    """Generates comprehensive checklists for app launches and updates."""

    def __init__(self, platform: str = 'both'):
        """
        Initialize checklist generator.

        Args:
            platform: 'apple', 'google', or 'both'
        """
        if platform not in ['apple', 'google', 'both']:
            raise ValueError("Platform must be 'apple', 'google', or 'both'")

        self.platform = platform

    def generate_prelaunch_checklist(
        self,
        app_info: Dict[str, Any],
        launch_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive pre-launch checklist.

        Args:
            app_info: App information (name, category, target_audience)
            launch_date: Target launch date (YYYY-MM-DD)

        Returns:
            Complete pre-launch checklist
        """
        checklist = {
            'app_info': app_info,
            'launch_date': launch_date,
            'checklists': {}
        }

        # Generate platform-specific checklists
        if self.platform in ['apple', 'both']:
            checklist['checklists']['apple'] = self._generate_apple_checklist(app_info)

        if self.platform in ['google', 'both']:
            checklist['checklists']['google'] = self._generate_google_checklist(app_info)

        # Add universal checklist items
        checklist['checklists']['universal'] = self._generate_universal_checklist(app_info)

        # Generate timeline
        if launch_date:
            checklist['timeline'] = self._generate_launch_timeline(launch_date)

        # Calculate completion status
        checklist['summary'] = self._calculate_checklist_summary(checklist['checklists'])

        return checklist

    def validate_app_store_compliance(
        self,
        app_data: Dict[str, Any],
        platform: str = 'apple'
    ) -> Dict[str, Any]:
        """
        Validate compliance with app store guidelines.

        Args:
            app_data: App data including metadata, privacy policy, etc.
            platform: 'apple' or 'google'

        Returns:
            Compliance validation report
        """
        validation_results = {
            'platform': platform,
            'is_compliant': True,
            'errors': [],
            'warnings': [],
            'recommendations': []
        }

        if platform == 'apple':
            self._validate_apple_compliance(app_data, validation_results)
        elif platform == 'google':
            self._validate_google_compliance(app_data, validation_results)

        # Determine overall compliance
        validation_results['is_compliant'] = len(validation_results['errors']) == 0

        return validation_results

    def create_update_plan(
        self,
        current_version: str,
        planned_features: List[str],
        update_frequency: str = 'monthly'
    ) -> Dict[str, Any]:
        """
        Create update cadence and feature rollout plan.

        Args:
            current_version: Current app version
            planned_features: List of planned features
            update_frequency: 'weekly', 'biweekly', 'monthly', 'quarterly'

        Returns:
            Update plan with cadence and feature schedule
        """
        # Calculate next versions
        next_versions = self._calculate_next_versions(
            current_version,
            update_frequency,
            len(planned_features)
        )

        # Distribute features across versions
        feature_schedule = self._distribute_features(
            planned_features,
            next_versions
        )

        # Generate "What's New" templates
        whats_new_templates = [
            self._generate_whats_new_template(version_data)
            for version_data in feature_schedule
        ]

        return {
            'current_version': current_version,
            'update_frequency': update_frequency,
            'planned_updates': len(feature_schedule),
            'feature_schedule': feature_schedule,
            'whats_new_templates': whats_new_templates,
            'recommendations': self._generate_update_recommendations(update_frequency)
        }

    def optimize_launch_timing(
        self,
        app_category: str,
        target_audience: str,
        current_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Recommend optimal launch timing.

        Args:
            app_category: App category
            target_audience: Target audience description
            current_date: Current date (YYYY-MM-DD), defaults to today

        Returns:
            Launch timing recommendations
        """
        if not current_date:
            current_date = datetime.now().strftime('%Y-%m-%d')

        # Analyze launch timing factors
        day_of_week_rec = self._recommend_day_of_week(app_category)
        seasonal_rec = self._recommend_seasonal_timing(app_category, current_date)
        competitive_rec = self._analyze_competitive_timing(app_category)

        # Calculate optimal dates
        optimal_dates = self._calculate_optimal_dates(
            current_date,
            day_of_week_rec,
            seasonal_rec
        )

        return {
            'current_date': current_date,
            'optimal_launch_dates': optimal_dates,
            'day_of_week_recommendation': day_of_week_rec,
            'seasonal_considerations': seasonal_rec,
            'competitive_timing': competitive_rec,
            'final_recommendation': self._generate_timing_recommendation(
                optimal_dates,
                seasonal_rec
            )
        }

    def plan_seasonal_campaigns(
        self,
        app_category: str,
        current_month: int = None
    ) -> Dict[str, Any]:
        """
        Identify seasonal opportunities for ASO campaigns.

        Args:
            app_category: App category
            current_month: Current month (1-12), defaults to current

        Returns:
            Seasonal campaign opportunities
        """
        if not current_month:
            current_month = datetime.now().month

        # Identify relevant seasonal events
        seasonal_opportunities = self._identify_seasonal_opportunities(
            app_category,
            current_month
        )

        # Generate campaign ideas
        campaigns = [
            self._generate_seasonal_campaign(opportunity)
            for opportunity in seasonal_opportunities
        ]

        return {
            'current_month': current_month,
            'category': app_category,
            'seasonal_opportunities': seasonal_opportunities,
            'campaign_ideas': campaigns,
            'implementation_timeline': self._create_seasonal_timeline(campaigns)
        }

    def _generate_apple_checklist(self, app_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate Apple App Store specific checklist."""
        return [
            {
                'category': 'App Store Connect Setup',
                'items': [
                    {'task': 'App Store Connect account created', 'status': 'pending'},
                    {'task': 'App bundle ID registered', 'status': 'pending'},
                    {'task': 'App Privacy declarations completed', 'status': 'pending'},
                    {'task': 'Age rating questionnaire completed', 'status': 'pending'}
                ]
            },
            {
                'category': 'Metadata (Apple)',
                'items': [
                    {'task': 'App title (30 chars max)', 'status': 'pending'},
                    {'task': 'Subtitle (30 chars max)', 'status': 'pending'},
                    {'task': 'Promotional text (170 chars max)', 'status': 'pending'},
                    {'task': 'Description (4000 chars max)', 'status': 'pending'},
                    {'task': 'Keywords (100 chars, comma-separated)', 'status': 'pending'},
                    {'task': 'Category selection (primary + secondary)', 'status': 'pending'}
                ]
            },
            {
                'category': 'Visual Assets (Apple)',
                'items': [
                    {'task': 'App icon (1024x1024px)', 'status': 'pending'},
                    {'task': 'Screenshots (iPhone 6.7" required)', 'status': 'pending'},
                    {'task': 'Screenshots (iPhone 5.5" required)', 'status': 'pending'},
                    {'task': 'Screenshots (iPad Pro 12.9" if iPad app)', 'status': 'pending'},
                    {'task': 'App preview video (optional but recommended)', 'status': 'pending'}
                ]
            },
            {
                'category': 'Technical Requirements (Apple)',
                'items': [
                    {'task': 'Build uploaded to App Store Connect', 'status': 'pending'},
                    {'task': 'TestFlight testing completed', 'status': 'pending'},
                    {'task': 'App tested on required iOS versions', 'status': 'pending'},
                    {'task': 'Crash-free rate > 99%', 'status': 'pending'},
                    {'task': 'All links in app/metadata working', 'status': 'pending'}
                ]
            },
            {
                'category': 'Legal & Privacy (Apple)',
                'items': [
                    {'task': 'Privacy Policy URL provided', 'status': 'pending'},
                    {'task': 'Terms of Service URL (if applicable)', 'status': 'pending'},
                    {'task': 'Data collection declarations accurate', 'status': 'pending'},
                    {'task': 'Third-party SDKs disclosed', 'status': 'pending'}
                ]
            }
        ]

    def _generate_google_checklist(self, app_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate Google Play Store specific checklist."""
        return [
            {
                'category': 'Play Console Setup',
                'items': [
                    {'task': 'Google Play Console account created', 'status': 'pending'},
                    {'task': 'Developer profile completed', 'status': 'pending'},
                    {'task': 'Payment merchant account linked (if paid app)', 'status': 'pending'},
                    {'task': 'Content rating questionnaire completed', 'status': 'pending'}
                ]
            },
            {
                'category': 'Metadata (Google)',
                'items': [
                    {'task': 'App title (50 chars max)', 'status': 'pending'},
                    {'task': 'Short description (80 chars max)', 'status': 'pending'},
                    {'task': 'Full description (4000 chars max)', 'status': 'pending'},
                    {'task': 'Category selection', 'status': 'pending'},
                    {'task': 'Tags (up to 5)', 'status': 'pending'}
                ]
            },
            {
                'category': 'Visual Assets (Google)',
                'items': [
                    {'task': 'App icon (512x512px)', 'status': 'pending'},
                    {'task': 'Feature graphic (1024x500px)', 'status': 'pending'},
                    {'task': 'Screenshots (2-8 required, phone)', 'status': 'pending'},
                    {'task': 'Screenshots (tablet, if applicable)', 'status': 'pending'},
                    {'task': 'Promo video (YouTube link, optional)', 'status': 'pending'}
                ]
            },
            {
                'category': 'Technical Requirements (Google)',
                'items': [
                    {'task': 'APK/AAB uploaded to Play Console', 'status': 'pending'},
                    {'task': 'Internal testing completed', 'status': 'pending'},
                    {'task': 'App tested on required Android versions', 'status': 'pending'},
                    {'task': 'Target API level meets requirements', 'status': 'pending'},
                    {'task': 'All permissions justified', 'status': 'pending'}
                ]
            },
            {
                'category': 'Legal & Privacy (Google)',
                'items': [
                    {'task': 'Privacy Policy URL provided', 'status': 'pending'},
                    {'task': 'Data safety section completed', 'status': 'pending'},
                    {'task': 'Ads disclosure (if applicable)', 'status': 'pending'},
                    {'task': 'In-app purchase disclosure (if applicable)', 'status': 'pending'}
                ]
            }
        ]

    def _generate_universal_checklist(self, app_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate universal (both platforms) checklist."""
        return [
            {
                'category': 'Pre-Launch Marketing',
                'items': [
                    {'task': 'Landing page created', 'status': 'pending'},
                    {'task': 'Social media accounts setup', 'status': 'pending'},
                    {'task': 'Press kit prepared', 'status': 'pending'},
                    {'task': 'Beta tester feedback collected', 'status': 'pending'},
                    {'task': 'Launch announcement drafted', 'status': 'pending'}
                ]
            },
            {
                'category': 'ASO Preparation',
                'items': [
                    {'task': 'Keyword research completed', 'status': 'pending'},
                    {'task': 'Competitor analysis done', 'status': 'pending'},
                    {'task': 'A/B test plan created for post-launch', 'status': 'pending'},
                    {'task': 'Analytics tracking configured', 'status': 'pending'}
                ]
            },
            {
                'category': 'Quality Assurance',
                'items': [
                    {'task': 'All core features tested', 'status': 'pending'},
                    {'task': 'User flows validated', 'status': 'pending'},
                    {'task': 'Performance testing completed', 'status': 'pending'},
                    {'task': 'Accessibility features tested', 'status': 'pending'},
                    {'task': 'Security audit completed', 'status': 'pending'}
                ]
            },
            {
                'category': 'Support Infrastructure',
                'items': [
                    {'task': 'Support email/system setup', 'status': 'pending'},
                    {'task': 'FAQ page created', 'status': 'pending'},
                    {'task': 'Documentation for users prepared', 'status': 'pending'},
                    {'task': 'Team trained on handling reviews', 'status': 'pending'}
                ]
            }
        ]

    def _generate_launch_timeline(self, launch_date: str) -> List[Dict[str, Any]]:
        """Generate timeline with milestones leading to launch."""
        launch_dt = datetime.strptime(launch_date, '%Y-%m-%d')

        milestones = [
            {
                'date': (launch_dt - timedelta(days=90)).strftime('%Y-%m-%d'),
                'milestone': '90 days before: Complete keyword research and competitor analysis'
            },
            {
                'date': (launch_dt - timedelta(days=60)).strftime('%Y-%m-%d'),
                'milestone': '60 days before: Finalize metadata and visual assets'
            },
            {
                'date': (launch_dt - timedelta(days=45)).strftime('%Y-%m-%d'),
                'milestone': '45 days before: Begin beta testing program'
            },
            {
                'date': (launch_dt - timedelta(days=30)).strftime('%Y-%m-%d'),
                'milestone': '30 days before: Submit app for review (Apple typically takes 1-2 days, Google instant)'
            },
            {
                'date': (launch_dt - timedelta(days=14)).strftime('%Y-%m-%d'),
                'milestone': '14 days before: Prepare launch marketing materials'
            },
            {
                'date': (launch_dt - timedelta(days=7)).strftime('%Y-%m-%d'),
                'milestone': '7 days before: Set up analytics and monitoring'
            },
            {
                'date': launch_dt.strftime('%Y-%m-%d'),
                'milestone': 'Launch Day: Release app and execute marketing plan'
            },
            {
                'date': (launch_dt + timedelta(days=7)).strftime('%Y-%m-%d'),
                'milestone': '7 days after: Monitor metrics, respond to reviews, address critical issues'
            },
            {
                'date': (launch_dt + timedelta(days=30)).strftime('%Y-%m-%d'),
                'milestone': '30 days after: Analyze launch metrics, plan first update'
            }
        ]

        return milestones

    def _calculate_checklist_summary(self, checklists: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Calculate completion summary."""
        total_items = 0
        completed_items = 0

        for platform, categories in checklists.items():
            for category in categories:
                for item in category['items']:
                    total_items += 1
                    if item['status'] == 'completed':
                        completed_items += 1

        completion_percentage = (completed_items / total_items * 100) if total_items > 0 else 0

        return {
            'total_items': total_items,
            'completed_items': completed_items,
            'pending_items': total_items - completed_items,
            'completion_percentage': round(completion_percentage, 1),
            'is_ready_to_launch': completion_percentage == 100
        }

    def _validate_apple_compliance(
        self,
        app_data: Dict[str, Any],
        validation_results: Dict[str, Any]
    ) -> None:
        """Validate Apple App Store compliance."""
        # Check for required fields
        if not app_data.get('privacy_policy_url'):
            validation_results['errors'].append("Privacy Policy URL is required")

        if not app_data.get('app_icon'):
            validation_results['errors'].append("App icon (1024x1024px) is required")

        # Check metadata character limits
        title = app_data.get('title', '')
        if len(title) > 30:
            validation_results['errors'].append(f"Title exceeds 30 characters ({len(title)})")

        # Warnings for best practices
        subtitle = app_data.get('subtitle', '')
        if not subtitle:
            validation_results['warnings'].append("Subtitle is empty - consider adding for better discoverability")

        keywords = app_data.get('keywords', '')
        if len(keywords) < 80:
            validation_results['warnings'].append(
                f"Keywords field underutilized ({len(keywords)}/100 chars) - add more keywords"
            )

    def _validate_google_compliance(
        self,
        app_data: Dict[str, Any],
        validation_results: Dict[str, Any]
    ) -> None:
        """Validate Google Play Store compliance."""
        # Check for required fields
        if not app_data.get('privacy_policy_url'):
            validation_results['errors'].append("Privacy Policy URL is required")

        if not app_data.get('feature_graphic'):
            validation_results['errors'].append("Feature graphic (1024x500px) is required")

        # Check metadata character limits
        title = app_data.get('title', '')
        if len(title) > 50:
            validation_results['errors'].append(f"Title exceeds 50 characters ({len(title)})")

        short_desc = app_data.get('short_description', '')
        if len(short_desc) > 80:
            validation_results['errors'].append(f"Short description exceeds 80 characters ({len(short_desc)})")

        # Warnings
        if not short_desc:
            validation_results['warnings'].append("Short description is empty")

    def _calculate_next_versions(
        self,
        current_version: str,
        update_frequency: str,
        feature_count: int
    ) -> List[str]:
        """Calculate next version numbers."""
        # Parse current version (assume semantic versioning)
        parts = current_version.split('.')
        major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2] if len(parts) > 2 else 0)

        versions = []
        for i in range(feature_count):
            if update_frequency == 'weekly':
                patch += 1
            elif update_frequency == 'biweekly':
                patch += 1
            elif update_frequency == 'monthly':
                minor += 1
                patch = 0
            else:  # quarterly
                minor += 1
                patch = 0

            versions.append(f"{major}.{minor}.{patch}")

        return versions

    def _distribute_features(
        self,
        features: List[str],
        versions: List[str]
    ) -> List[Dict[str, Any]]:
        """Distribute features across versions."""
        features_per_version = max(1, len(features) // len(versions))

        schedule = []
        for i, version in enumerate(versions):
            start_idx = i * features_per_version
            end_idx = start_idx + features_per_version if i < len(versions) - 1 else len(features)

            schedule.append({
                'version': version,
                'features': features[start_idx:end_idx],
                'release_priority': 'high' if i == 0 else ('medium' if i < len(versions) // 2 else 'low')
            })

        return schedule

    def _generate_whats_new_template(self, version_data: Dict[str, Any]) -> Dict[str, str]:
        """Generate What's New template for version."""
        features_list = '\n'.join([f"• {feature}" for feature in version_data['features']])

        template = f"""Version {version_data['version']}

{features_list}

We're constantly improving your experience. Thanks for using [App Name]!

Have feedback? Contact us at support@[company].com"""

        return {
            'version': version_data['version'],
            'template': template
        }

    def _generate_update_recommendations(self, update_frequency: str) -> List[str]:
        """Generate recommendations for update strategy."""
        recommendations = []

        if update_frequency == 'weekly':
            recommendations.append("Weekly updates show active development but ensure quality doesn't suffer")
        elif update_frequency == 'monthly':
            recommendations.append("Monthly updates are optimal for most apps - balance features and stability")

        recommendations.extend([
            "Include bug fixes in every update",
            "Update 'What's New' section with each release",
            "Respond to reviews mentioning fixed issues"
        ])

        return recommendations

    def _recommend_day_of_week(self, app_category: str) -> Dict[str, Any]:
        """Recommend best day of week to launch."""
        # General recommendations based on category
        if app_category.lower() in ['games', 'entertainment']:
            return {
                'recommended_day': 'Thursday',
                'rationale': 'People download entertainment apps before weekend'
            }
        elif app_category.lower() in ['productivity', 'business']:
            return {
                'recommended_day': 'Tuesday',
                'rationale': 'Business users most active mid-week'
            }
        else:
            return {
                'recommended_day': 'Wednesday',
                'rationale': 'Mid-week provides good balance and review potential'
            }

    def _recommend_seasonal_timing(self, app_category: str, current_date: str) -> Dict[str, Any]:
        """Recommend seasonal timing considerations."""
        current_dt = datetime.strptime(current_date, '%Y-%m-%d')
        month = current_dt.month

        # Avoid certain periods
        avoid_periods = []
        if month == 12:
            avoid_periods.append("Late December - low user engagement during holidays")
        if month in [7, 8]:
            avoid_periods.append("Summer months - some categories see lower engagement")

        # Recommend periods
        good_periods = []
        if month in [1, 9]:
            good_periods.append("New Year/Back-to-school - high user engagement")
        if month in [10, 11]:
            good_periods.append("Pre-holiday season - good for shopping/gift apps")

        return {
            'current_month': month,
            'avoid_periods': avoid_periods,
            'good_periods': good_periods
        }

    def _analyze_competitive_timing(self, app_category: str) -> Dict[str, str]:
        """Analyze competitive timing considerations."""
        return {
            'recommendation': 'Research competitor launch schedules in your category',
            'strategy': 'Avoid launching same week as major competitor updates'
        }

    def _calculate_optimal_dates(
        self,
        current_date: str,
        day_rec: Dict[str, Any],
        seasonal_rec: Dict[str, Any]
    ) -> List[str]:
        """Calculate optimal launch dates."""
        current_dt = datetime.strptime(current_date, '%Y-%m-%d')

        # Find next occurrence of recommended day
        target_day = day_rec['recommended_day']
        days_map = {'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4}
        target_day_num = days_map.get(target_day, 2)

        days_ahead = (target_day_num - current_dt.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7

        next_target_date = current_dt + timedelta(days=days_ahead)

        optimal_dates = [
            next_target_date.strftime('%Y-%m-%d'),
            (next_target_date + timedelta(days=7)).strftime('%Y-%m-%d'),
            (next_target_date + timedelta(days=14)).strftime('%Y-%m-%d')
        ]

        return optimal_dates

    def _generate_timing_recommendation(
        self,
        optimal_dates: List[str],
        seasonal_rec: Dict[str, Any]
    ) -> str:
        """Generate final timing recommendation."""
        if seasonal_rec['avoid_periods']:
            return f"Consider launching in {optimal_dates[1]} to avoid {seasonal_rec['avoid_periods'][0]}"
        elif seasonal_rec['good_periods']:
            return f"Launch on {optimal_dates[0]} to capitalize on {seasonal_rec['good_periods'][0]}"
        else:
            return f"Recommended launch date: {optimal_dates[0]}"

    def _identify_seasonal_opportunities(
        self,
        app_category: str,
        current_month: int
    ) -> List[Dict[str, Any]]:
        """Identify seasonal opportunities for category."""
        opportunities = []

        # Universal opportunities
        if current_month == 1:
            opportunities.append({
                'event': 'New Year Resolutions',
                'dates': 'January 1-31',
                'relevance': 'high' if app_category.lower() in ['health', 'fitness', 'productivity'] else 'medium'
            })

        if current_month in [11, 12]:
            opportunities.append({
                'event': 'Holiday Shopping Season',
                'dates': 'November-December',
                'relevance': 'high' if app_category.lower() in ['shopping', 'gifts'] else 'low'
            })

        # Category-specific
        if app_category.lower() == 'education' and current_month in [8, 9]:
            opportunities.append({
                'event': 'Back to School',
                'dates': 'August-September',
                'relevance': 'high'
            })

        return opportunities

    def _generate_seasonal_campaign(self, opportunity: Dict[str, Any]) -> Dict[str, Any]:
        """Generate campaign idea for seasonal opportunity."""
        return {
            'event': opportunity['event'],
            'campaign_idea': f"Create themed visuals and messaging for {opportunity['event']}",
            'metadata_updates': 'Update app description and screenshots with seasonal themes',
            'promotion_strategy': 'Consider limited-time features or discounts'
        }

    def _create_seasonal_timeline(self, campaigns: List[Dict[str, Any]]) -> List[str]:
        """Create implementation timeline for campaigns."""
        return [
            f"30 days before: Plan {campaign['event']} campaign strategy"
            for campaign in campaigns
        ]


def generate_launch_checklist(
    platform: str,
    app_info: Dict[str, Any],
    launch_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to generate launch checklist.

    Args:
        platform: Platform ('apple', 'google', or 'both')
        app_info: App information
        launch_date: Target launch date

    Returns:
        Complete launch checklist
    """
    generator = LaunchChecklistGenerator(platform)
    return generator.generate_prelaunch_checklist(app_info, launch_date)
