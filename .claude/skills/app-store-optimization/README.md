# App Store Optimization (ASO) Skill

**Version**: 1.0.0
**Last Updated**: November 7, 2025
**Author**: Claude Skills Factory

## Overview

A comprehensive App Store Optimization (ASO) skill that provides complete capabilities for researching, optimizing, and tracking mobile app performance on the Apple App Store and Google Play Store. This skill empowers app developers and marketers to maximize their app's visibility, downloads, and success in competitive app marketplaces.

## What This Skill Does

This skill provides end-to-end ASO capabilities across seven key areas:

1. **Research & Analysis**: Keyword research, competitor analysis, market trends, review sentiment
2. **Metadata Optimization**: Title, description, keywords with platform-specific character limits
3. **Conversion Optimization**: A/B testing framework, visual asset optimization
4. **Rating & Review Management**: Sentiment analysis, response strategies, issue identification
5. **Launch & Update Strategies**: Pre-launch checklists, timing optimization, update planning
6. **Analytics & Tracking**: ASO scoring, keyword rankings, performance benchmarking
7. **Localization**: Multi-language strategy, translation management, ROI analysis

## Key Features

### Comprehensive Keyword Research
- Search volume and competition analysis
- Long-tail keyword discovery
- Competitor keyword extraction
- Keyword difficulty scoring
- Strategic prioritization

### Platform-Specific Metadata Optimization
- **Apple App Store**:
  - Title (30 chars)
  - Subtitle (30 chars)
  - Promotional Text (170 chars)
  - Description (4000 chars)
  - Keywords field (100 chars)
- **Google Play Store**:
  - Title (50 chars)
  - Short Description (80 chars)
  - Full Description (4000 chars)
- Character limit validation
- Keyword density analysis
- Multiple optimization strategies

### Competitor Intelligence
- Automated competitor discovery
- Metadata strategy analysis
- Visual asset assessment
- Gap identification
- Competitive positioning

### ASO Health Scoring
- 0-100 overall score
- Four-category breakdown (Metadata, Ratings, Keywords, Conversion)
- Strengths and weaknesses identification
- Prioritized action recommendations
- Expected impact estimates

### Scientific A/B Testing
- Test design and hypothesis formulation
- Sample size calculation
- Statistical significance analysis
- Duration estimation
- Implementation recommendations

### Global Localization
- Market prioritization (Tier 1/2/3)
- Translation cost estimation
- Character limit adaptation by language
- Cultural keyword considerations
- ROI analysis

### Review Intelligence
- Sentiment analysis
- Common theme extraction
- Bug and issue identification
- Feature request clustering
- Professional response templates

### Launch Planning
- Platform-specific checklists
- Timeline generation
- Compliance validation
- Optimal timing recommendations
- Seasonal campaign planning

## Python Modules

This skill includes 8 powerful Python modules:

### 1. keyword_analyzer.py
**Purpose**: Analyzes keywords for search volume, competition, and relevance

**Key Functions**:
- `analyze_keyword()`: Single keyword analysis
- `compare_keywords()`: Multi-keyword comparison and ranking
- `find_long_tail_opportunities()`: Generate long-tail variations
- `calculate_keyword_density()`: Analyze keyword usage in text
- `extract_keywords_from_text()`: Extract keywords from reviews/descriptions

### 2. metadata_optimizer.py
**Purpose**: Optimizes titles, descriptions, keywords with character limit validation

**Key Functions**:
- `optimize_title()`: Generate optimal title options
- `optimize_description()`: Create conversion-focused descriptions
- `optimize_keyword_field()`: Maximize Apple's 100-char keyword field
- `validate_character_limits()`: Ensure platform compliance
- `calculate_keyword_density()`: Analyze keyword integration

### 3. competitor_analyzer.py
**Purpose**: Analyzes competitor ASO strategies

**Key Functions**:
- `analyze_competitor()`: Single competitor deep-dive
- `compare_competitors()`: Multi-competitor analysis
- `identify_gaps()`: Find competitive opportunities
- `_calculate_competitive_strength()`: Score competitor ASO quality

### 4. aso_scorer.py
**Purpose**: Calculates comprehensive ASO health score

**Key Functions**:
- `calculate_overall_score()`: 0-100 ASO health score
- `score_metadata_quality()`: Evaluate metadata optimization
- `score_ratings_reviews()`: Assess rating quality and volume
- `score_keyword_performance()`: Analyze ranking positions
- `score_conversion_metrics()`: Evaluate conversion rates
- `generate_recommendations()`: Prioritized improvement actions

### 5. ab_test_planner.py
**Purpose**: Plans and tracks A/B tests for ASO elements

**Key Functions**:
- `design_test()`: Create test hypothesis and structure
- `calculate_sample_size()`: Determine required visitors
- `calculate_significance()`: Assess statistical validity
- `track_test_results()`: Monitor ongoing tests
- `generate_test_report()`: Create comprehensive test reports

### 6. localization_helper.py
**Purpose**: Manages multi-language ASO optimization

**Key Functions**:
- `identify_target_markets()`: Prioritize localization markets
- `translate_metadata()`: Adapt metadata for languages
- `adapt_keywords()`: Cultural keyword adaptation
- `validate_translations()`: Character limit validation
- `calculate_localization_roi()`: Estimate investment returns

### 7. review_analyzer.py
**Purpose**: Analyzes user reviews for actionable insights

**Key Functions**:
- `analyze_sentiment()`: Calculate sentiment distribution
- `extract_common_themes()`: Identify frequent topics
- `identify_issues()`: Surface bugs and problems
- `find_feature_requests()`: Extract desired features
- `track_sentiment_trends()`: Monitor changes over time
- `generate_response_templates()`: Create review responses

### 8. launch_checklist.py
**Purpose**: Generates comprehensive launch and update checklists

**Key Functions**:
- `generate_prelaunch_checklist()`: Complete submission validation
- `validate_app_store_compliance()`: Check guidelines compliance
- `create_update_plan()`: Plan update cadence
- `optimize_launch_timing()`: Recommend launch dates
- `plan_seasonal_campaigns()`: Identify seasonal opportunities

## Installation

### For Claude Code (Desktop/CLI)

#### Project-Level Installation
```bash
# Copy skill folder to project
cp -r app-store-optimization /path/to/your/project/.claude/skills/

# Claude will auto-load the skill when working in this project
```

#### User-Level Installation (Available in All Projects)
```bash
# Copy skill folder to user-level skills
cp -r app-store-optimization ~/.claude/skills/

# Claude will load this skill in all your projects
```

### For Claude Apps (Browser)

1. Use the `skill-creator` skill to import the skill
2. Or manually import via Claude Apps interface

### Verification

To verify installation:
```bash
# Check if skill folder exists
ls ~/.claude/skills/app-store-optimization/

# You should see:
# SKILL.md
# keyword_analyzer.py
# metadata_optimizer.py
# competitor_analyzer.py
# aso_scorer.py
# ab_test_planner.py
# localization_helper.py
# review_analyzer.py
# launch_checklist.py
# sample_input.json
# expected_output.json
# HOW_TO_USE.md
# README.md
```

## Usage Examples

### Example 1: Complete Keyword Research

```
Hey Claude—I just added the "app-store-optimization" skill. Can you research keywords for my fitness app? I'm targeting people who want home workouts, yoga, and meal planning. Analyze top competitors like Nike Training Club and Peloton.
```

**What Claude will do**:
- Use `keyword_analyzer.py` to research keywords
- Use `competitor_analyzer.py` to analyze Nike Training Club and Peloton
- Provide prioritized keyword list with search volumes, competition levels
- Identify gaps and long-tail opportunities
- Recommend primary keywords for title and secondary keywords for description

### Example 2: Optimize App Store Metadata

```
Hey Claude—I just added the "app-store-optimization" skill. Optimize my app's metadata for both Apple App Store and Google Play Store:
- App: FitFlow
- Category: Health & Fitness
- Features: AI workout plans, nutrition tracking, progress photos
- Keywords: fitness app, workout planner, home fitness
```

**What Claude will do**:
- Use `metadata_optimizer.py` to create optimized titles (multiple options)
- Generate platform-specific descriptions (short and full)
- Optimize Apple's 100-character keyword field
- Validate all character limits
- Calculate keyword density
- Provide before/after comparison

### Example 3: Calculate ASO Health Score

```
Hey Claude—I just added the "app-store-optimization" skill. Calculate my app's ASO score:
- Average rating: 4.3 stars (8,200 ratings)
- Keywords in top 10: 4
- Keywords in top 50: 15
- Conversion rate: 3.8%
- Title: "FitFlow - Home Workouts"
- Description: 1,500 characters with 3 keyword mentions
```

**What Claude will do**:
- Use `aso_scorer.py` to calculate overall score (0-100)
- Break down by category (Metadata: X/25, Ratings: X/25, Keywords: X/25, Conversion: X/25)
- Identify strengths and weaknesses
- Generate prioritized recommendations
- Estimate impact of improvements

### Example 4: A/B Test Planning

```
Hey Claude—I just added the "app-store-optimization" skill. I want to A/B test my app icon. My current conversion rate is 4.2%. How many visitors do I need and how long should I run the test?
```

**What Claude will do**:
- Use `ab_test_planner.py` to design test
- Calculate required sample size (based on minimum detectable effect)
- Estimate test duration for low/medium/high traffic scenarios
- Provide test structure and success metrics
- Explain how to analyze results

### Example 5: Review Sentiment Analysis

```
Hey Claude—I just added the "app-store-optimization" skill. Analyze my last 500 reviews and tell me:
- Overall sentiment
- Most common complaints
- Top feature requests
- Bugs needing immediate fixes
```

**What Claude will do**:
- Use `review_analyzer.py` to process reviews
- Calculate sentiment distribution
- Extract common themes
- Identify and prioritize issues
- Cluster feature requests
- Generate response templates

### Example 6: Pre-Launch Checklist

```
Hey Claude—I just added the "app-store-optimization" skill. Generate a complete pre-launch checklist for both app stores. My launch date is March 15, 2026.
```

**What Claude will do**:
- Use `launch_checklist.py` to generate checklists
- Create Apple App Store checklist (metadata, assets, technical, legal)
- Create Google Play Store checklist (metadata, assets, technical, legal)
- Add universal checklist (marketing, QA, support)
- Generate timeline with milestones
- Calculate completion percentage

## Best Practices

### Keyword Research
1. Start with 20-30 seed keywords
2. Analyze top 5 competitors in your category
3. Balance high-volume and long-tail keywords
4. Prioritize relevance over search volume
5. Update keyword research quarterly

### Metadata Optimization
1. Front-load keywords in title (first 15 characters most important)
2. Use every available character (don't waste space)
3. Write for humans first, search engines second
4. A/B test major changes before committing
5. Update descriptions with each major release

### A/B Testing
1. Test one element at a time (icon vs. screenshots vs. title)
2. Run tests to statistical significance (90%+ confidence)
3. Test high-impact elements first (icon has biggest impact)
4. Allow sufficient duration (at least 1 week, preferably 2-3)
5. Document learnings for future tests

### Localization
1. Start with top 5 revenue markets (US, China, Japan, Germany, UK)
2. Use professional translators, not machine translation
3. Test translations with native speakers
4. Adapt keywords for cultural context
5. Monitor ROI by market

### Review Management
1. Respond to reviews within 24-48 hours
2. Always be professional, even with negative reviews
3. Address specific issues raised
4. Thank users for positive feedback
5. Use insights to prioritize product improvements

## Technical Requirements

- **Python**: 3.7+ (for Python modules)
- **Platform Support**: Apple App Store, Google Play Store
- **Data Formats**: JSON input/output
- **Dependencies**: Standard library only (no external packages required)

## Limitations

### Data Dependencies
- Keyword search volumes are estimates (no official Apple/Google data)
- Competitor data limited to publicly available information
- Review analysis requires access to public reviews
- Historical data may not be available for new apps

### Platform Constraints
- Apple: Metadata changes require app submission (except Promotional Text)
- Google: Metadata changes take 1-2 hours to index
- A/B testing requires significant traffic for statistical significance
- Store algorithms are proprietary and change without notice

### Scope
- Does not include paid user acquisition (Apple Search Ads, Google Ads)
- Does not cover in-app analytics implementation
- Does not handle technical app development
- Focuses on organic discovery and conversion optimization

## Troubleshooting

### Issue: Python modules not found
**Solution**: Ensure all .py files are in the same directory as SKILL.md

### Issue: Character limit validation failing
**Solution**: Check that you're using the correct platform ('apple' or 'google')

### Issue: Keyword research returning limited results
**Solution**: Provide more context about your app, features, and target audience

### Issue: ASO score seems inaccurate
**Solution**: Ensure you're providing accurate metrics (ratings, keyword rankings, conversion rate)

## Version History

### Version 1.0.0 (November 7, 2025)
- Initial release
- 8 Python modules with comprehensive ASO capabilities
- Support for both Apple App Store and Google Play Store
- Keyword research, metadata optimization, competitor analysis
- ASO scoring, A/B testing, localization, review analysis
- Launch planning and seasonal campaign tools

## Support & Feedback

This skill is designed to help app developers and marketers succeed in competitive app marketplaces. For the best results:

1. Provide detailed context about your app
2. Include specific metrics when available
3. Ask follow-up questions for clarification
4. Iterate based on results

## Credits

Developed by Claude Skills Factory
Based on industry-standard ASO best practices
Platform requirements current as of November 2025

## License

This skill is provided as-is for use with Claude Code and Claude Apps. Customize and extend as needed for your specific use cases.

---

**Ready to optimize your app?** Start with keyword research, then move to metadata optimization, and finally implement A/B testing for continuous improvement. The skill handles everything from pre-launch planning to ongoing optimization.

For detailed usage examples, see [HOW_TO_USE.md](HOW_TO_USE.md).
