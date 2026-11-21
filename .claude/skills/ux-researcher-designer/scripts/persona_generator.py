#!/usr/bin/env python3
"""
Data-Driven Persona Generator
Creates research-backed user personas from user data and interviews.

Usage:
    python persona_generator.py [json]

    Without arguments: Human-readable formatted output
    With 'json': JSON output for integration with other tools

Examples:
    python persona_generator.py           # Formatted persona output
    python persona_generator.py json      # JSON for programmatic use

Table of Contents:
==================

CLASS: PersonaGenerator
    __init__()                      - Initialize archetype templates and persona components
    generate_persona_from_data()    - Main entry: generate persona from user data + interviews
    format_persona_output()         - Format persona dict as human-readable text

PATTERN ANALYSIS:
    _analyze_user_patterns()        - Extract usage, device, context patterns from data
    _identify_archetype()           - Classify user into power/casual/business/mobile archetype
    _analyze_behaviors()            - Analyze usage patterns and feature preferences

DEMOGRAPHIC EXTRACTION:
    _aggregate_demographics()       - Calculate age range, location, tech proficiency
    _extract_psychographics()       - Extract motivations, values, attitudes, lifestyle

NEEDS & FRUSTRATIONS:
    _identify_needs()               - Identify primary/secondary goals, functional/emotional needs
    _extract_frustrations()         - Extract pain points from patterns and interviews

CONTENT GENERATION:
    _generate_name()                - Generate persona name from archetype
    _generate_tagline()             - Generate one-line persona summary
    _generate_scenarios()           - Create usage scenarios based on archetype
    _select_quote()                 - Select representative quote from interviews

DATA VALIDATION:
    _calculate_data_points()        - Calculate sample size and confidence level
    _derive_design_implications()   - Generate actionable design recommendations

FUNCTIONS:
    create_sample_user_data()       - Generate sample data for testing/demo
    main()                          - CLI entry point

Archetypes Supported:
    - power_user: Daily users, 10+ features, efficiency-focused
    - casual_user: Weekly users, basic needs, simplicity-focused
    - business_user: Work context, team collaboration, ROI-focused
    - mobile_first: Mobile primary, on-the-go, quick interactions

Output Components:
    - name, archetype, tagline, quote
    - demographics: age, location, occupation, education, tech_proficiency
    - psychographics: motivations, values, attitudes, lifestyle
    - behaviors: usage_patterns, feature_preferences, interaction_style
    - needs_and_goals: primary, secondary, functional, emotional
    - frustrations: pain points with frequency
    - scenarios: contextual usage stories
    - data_points: sample_size, confidence_level, validation_method
    - design_implications: actionable recommendations
"""

import json
from typing import Dict, List, Tuple
from collections import Counter, defaultdict
import random

class PersonaGenerator:
    """Generate data-driven personas from user research"""
    
    def __init__(self):
        self.persona_components = {
            'demographics': ['age', 'location', 'occupation', 'education', 'income'],
            'psychographics': ['goals', 'frustrations', 'motivations', 'values'],
            'behaviors': ['tech_savviness', 'usage_frequency', 'preferred_devices', 'key_activities'],
            'needs': ['functional', 'emotional', 'social']
        }
        
        self.archetype_templates = {
            'power_user': {
                'characteristics': ['tech-savvy', 'frequent user', 'early adopter', 'efficiency-focused'],
                'goals': ['maximize productivity', 'automate workflows', 'access advanced features'],
                'frustrations': ['slow performance', 'limited customization', 'lack of shortcuts'],
                'quote': "I need tools that can keep up with my workflow"
            },
            'casual_user': {
                'characteristics': ['occasional user', 'basic needs', 'prefers simplicity'],
                'goals': ['accomplish specific tasks', 'easy to use', 'minimal learning curve'],
                'frustrations': ['complexity', 'too many options', 'unclear navigation'],
                'quote': "I just want it to work without having to think about it"
            },
            'business_user': {
                'characteristics': ['professional context', 'ROI-focused', 'team collaboration'],
                'goals': ['improve team efficiency', 'track metrics', 'integrate with tools'],
                'frustrations': ['lack of reporting', 'poor collaboration features', 'no enterprise features'],
                'quote': "I need to show clear value to my stakeholders"
            },
            'mobile_first': {
                'characteristics': ['primarily mobile', 'on-the-go usage', 'quick interactions'],
                'goals': ['access anywhere', 'quick actions', 'offline capability'],
                'frustrations': ['poor mobile experience', 'desktop-only features', 'slow loading'],
                'quote': "My phone is my primary computing device"
            }
        }
    
    def generate_persona_from_data(self, user_data: List[Dict], 
                                  interview_insights: List[Dict] = None) -> Dict:
        """Generate persona from user data and optional interview insights"""
        
        # Analyze user data for patterns
        patterns = self._analyze_user_patterns(user_data)
        
        # Identify persona archetype
        archetype = self._identify_archetype(patterns)
        
        # Generate persona
        persona = {
            'name': self._generate_name(archetype),
            'archetype': archetype,
            'tagline': self._generate_tagline(patterns),
            'demographics': self._aggregate_demographics(user_data),
            'psychographics': self._extract_psychographics(patterns, interview_insights),
            'behaviors': self._analyze_behaviors(user_data),
            'needs_and_goals': self._identify_needs(patterns, interview_insights),
            'frustrations': self._extract_frustrations(patterns, interview_insights),
            'scenarios': self._generate_scenarios(archetype, patterns),
            'quote': self._select_quote(interview_insights, archetype),
            'data_points': self._calculate_data_points(user_data),
            'design_implications': self._derive_design_implications(patterns)
        }
        
        return persona
    
    def _analyze_user_patterns(self, user_data: List[Dict]) -> Dict:
        """Analyze patterns in user data"""
        
        patterns = {
            'usage_frequency': defaultdict(int),
            'feature_usage': defaultdict(int),
            'devices': defaultdict(int),
            'contexts': defaultdict(int),
            'pain_points': [],
            'success_metrics': []
        }
        
        for user in user_data:
            # Frequency patterns
            freq = user.get('usage_frequency', 'medium')
            patterns['usage_frequency'][freq] += 1
            
            # Feature usage
            for feature in user.get('features_used', []):
                patterns['feature_usage'][feature] += 1
            
            # Device patterns
            device = user.get('primary_device', 'desktop')
            patterns['devices'][device] += 1
            
            # Context patterns
            context = user.get('usage_context', 'work')
            patterns['contexts'][context] += 1
            
            # Pain points
            if 'pain_points' in user:
                patterns['pain_points'].extend(user['pain_points'])
        
        return patterns
    
    def _identify_archetype(self, patterns: Dict) -> str:
        """Identify persona archetype based on patterns"""
        
        # Simple heuristic-based archetype identification
        freq_pattern = max(patterns['usage_frequency'].items(), key=lambda x: x[1])[0] if patterns['usage_frequency'] else 'medium'
        device_pattern = max(patterns['devices'].items(), key=lambda x: x[1])[0] if patterns['devices'] else 'desktop'
        
        if freq_pattern == 'daily' and len(patterns['feature_usage']) > 10:
            return 'power_user'
        elif device_pattern in ['mobile', 'tablet']:
            return 'mobile_first'
        elif patterns['contexts'].get('work', 0) > patterns['contexts'].get('personal', 0):
            return 'business_user'
        else:
            return 'casual_user'
    
    def _generate_name(self, archetype: str) -> str:
        """Generate persona name based on archetype"""
        
        names = {
            'power_user': ['Alex', 'Sam', 'Jordan', 'Morgan'],
            'casual_user': ['Pat', 'Jamie', 'Casey', 'Riley'],
            'business_user': ['Taylor', 'Cameron', 'Avery', 'Blake'],
            'mobile_first': ['Quinn', 'Skylar', 'River', 'Sage']
        }
        
        name_pool = names.get(archetype, names['casual_user'])
        first_name = random.choice(name_pool)
        
        roles = {
            'power_user': 'the Power User',
            'casual_user': 'the Casual User',
            'business_user': 'the Business Professional',
            'mobile_first': 'the Mobile Native'
        }
        
        return f"{first_name} {roles[archetype]}"
    
    def _generate_tagline(self, patterns: Dict) -> str:
        """Generate persona tagline"""
        
        freq = max(patterns['usage_frequency'].items(), key=lambda x: x[1])[0] if patterns['usage_frequency'] else 'regular'
        context = max(patterns['contexts'].items(), key=lambda x: x[1])[0] if patterns['contexts'] else 'general'
        
        return f"A {freq} user who primarily uses the product for {context} purposes"
    
    def _aggregate_demographics(self, user_data: List[Dict]) -> Dict:
        """Aggregate demographic information"""
        
        demographics = {
            'age_range': '',
            'location_type': '',
            'occupation_category': '',
            'education_level': '',
            'tech_proficiency': ''
        }
        
        if not user_data:
            return demographics
        
        # Age range
        ages = [u.get('age', 30) for u in user_data if 'age' in u]
        if ages:
            avg_age = sum(ages) / len(ages)
            if avg_age < 25:
                demographics['age_range'] = '18-24'
            elif avg_age < 35:
                demographics['age_range'] = '25-34'
            elif avg_age < 45:
                demographics['age_range'] = '35-44'
            else:
                demographics['age_range'] = '45+'
        
        # Location type
        locations = [u.get('location_type', 'urban') for u in user_data if 'location_type' in u]
        if locations:
            demographics['location_type'] = Counter(locations).most_common(1)[0][0]
        
        # Tech proficiency
        tech_scores = [u.get('tech_proficiency', 5) for u in user_data if 'tech_proficiency' in u]
        if tech_scores:
            avg_tech = sum(tech_scores) / len(tech_scores)
            if avg_tech < 3:
                demographics['tech_proficiency'] = 'Beginner'
            elif avg_tech < 7:
                demographics['tech_proficiency'] = 'Intermediate'
            else:
                demographics['tech_proficiency'] = 'Advanced'
        
        return demographics
    
    def _extract_psychographics(self, patterns: Dict, interviews: List[Dict] = None) -> Dict:
        """Extract psychographic information"""
        
        psychographics = {
            'motivations': [],
            'values': [],
            'attitudes': [],
            'lifestyle': ''
        }
        
        # Extract from patterns
        if patterns['usage_frequency'].get('daily', 0) > 0:
            psychographics['motivations'].append('Efficiency')
            psychographics['values'].append('Time-saving')
        
        if patterns['devices'].get('mobile', 0) > patterns['devices'].get('desktop', 0):
            psychographics['lifestyle'] = 'On-the-go, mobile-first'
            psychographics['values'].append('Flexibility')
        
        # Extract from interviews if available
        if interviews:
            for interview in interviews:
                if 'motivations' in interview:
                    psychographics['motivations'].extend(interview['motivations'])
                if 'values' in interview:
                    psychographics['values'].extend(interview['values'])
        
        # Deduplicate
        psychographics['motivations'] = list(set(psychographics['motivations']))[:5]
        psychographics['values'] = list(set(psychographics['values']))[:5]
        
        return psychographics
    
    def _analyze_behaviors(self, user_data: List[Dict]) -> Dict:
        """Analyze user behaviors"""
        
        behaviors = {
            'usage_patterns': [],
            'feature_preferences': [],
            'interaction_style': '',
            'learning_preference': ''
        }
        
        if not user_data:
            return behaviors
        
        # Usage patterns
        frequencies = [u.get('usage_frequency', 'medium') for u in user_data]
        freq_counter = Counter(frequencies)
        behaviors['usage_patterns'] = [f"{freq}: {count} users" for freq, count in freq_counter.most_common(3)]
        
        # Feature preferences
        all_features = []
        for user in user_data:
            all_features.extend(user.get('features_used', []))
        
        feature_counter = Counter(all_features)
        behaviors['feature_preferences'] = [feat for feat, count in feature_counter.most_common(5)]
        
        # Interaction style
        if len(behaviors['feature_preferences']) > 10:
            behaviors['interaction_style'] = 'Exploratory - uses many features'
        else:
            behaviors['interaction_style'] = 'Focused - uses core features'
        
        return behaviors
    
    def _identify_needs(self, patterns: Dict, interviews: List[Dict] = None) -> Dict:
        """Identify user needs and goals"""
        
        needs = {
            'primary_goals': [],
            'secondary_goals': [],
            'functional_needs': [],
            'emotional_needs': []
        }
        
        # Derive from usage patterns
        if patterns['usage_frequency'].get('daily', 0) > 0:
            needs['primary_goals'].append('Complete tasks efficiently')
            needs['functional_needs'].append('Speed and performance')
        
        if patterns['contexts'].get('work', 0) > 0:
            needs['primary_goals'].append('Professional productivity')
            needs['functional_needs'].append('Integration with work tools')
        
        # Common emotional needs
        needs['emotional_needs'] = [
            'Feel confident using the product',
            'Trust the system with data',
            'Feel supported when issues arise'
        ]
        
        # Extract from interviews
        if interviews:
            for interview in interviews:
                if 'goals' in interview:
                    needs['primary_goals'].extend(interview['goals'][:2])
                if 'needs' in interview:
                    needs['functional_needs'].extend(interview['needs'][:3])
        
        return needs
    
    def _extract_frustrations(self, patterns: Dict, interviews: List[Dict] = None) -> List[str]:
        """Extract user frustrations"""
        
        frustrations = []
        
        # Common frustrations from patterns
        if patterns['pain_points']:
            frustration_counter = Counter(patterns['pain_points'])
            frustrations = [pain for pain, count in frustration_counter.most_common(5)]
        
        # Add archetype-specific frustrations if not enough from data
        if len(frustrations) < 3:
            frustrations.extend([
                'Slow loading times',
                'Confusing navigation',
                'Lack of mobile optimization'
            ])
        
        return frustrations[:5]
    
    def _generate_scenarios(self, archetype: str, patterns: Dict) -> List[Dict]:
        """Generate usage scenarios"""
        
        scenarios = []
        
        # Common scenarios based on archetype
        scenario_templates = {
            'power_user': [
                {
                    'title': 'Bulk Processing',
                    'context': 'Monday morning, needs to process week\'s data',
                    'goal': 'Complete batch operations quickly',
                    'steps': ['Import data', 'Apply bulk actions', 'Export results'],
                    'pain_points': ['No keyboard shortcuts', 'Slow processing']
                }
            ],
            'casual_user': [
                {
                    'title': 'Quick Task',
                    'context': 'Needs to complete single task',
                    'goal': 'Get in, complete task, get out',
                    'steps': ['Find feature', 'Complete task', 'Save/Exit'],
                    'pain_points': ['Can\'t find feature', 'Too many steps']
                }
            ],
            'business_user': [
                {
                    'title': 'Team Collaboration',
                    'context': 'Working with team on project',
                    'goal': 'Share and collaborate efficiently',
                    'steps': ['Create content', 'Share with team', 'Track feedback'],
                    'pain_points': ['No real-time collaboration', 'Poor permission management']
                }
            ],
            'mobile_first': [
                {
                    'title': 'On-the-Go Access',
                    'context': 'Commuting, needs quick access',
                    'goal': 'Complete task on mobile',
                    'steps': ['Open mobile app', 'Quick action', 'Sync with desktop'],
                    'pain_points': ['Feature parity issues', 'Poor mobile UX']
                }
            ]
        }
        
        return scenario_templates.get(archetype, scenario_templates['casual_user'])
    
    def _select_quote(self, interviews: List[Dict] = None, archetype: str = 'casual_user') -> str:
        """Select representative quote"""
        
        if interviews:
            # Try to find a real quote
            for interview in interviews:
                if 'quotes' in interview and interview['quotes']:
                    return interview['quotes'][0]
        
        # Use archetype default
        return self.archetype_templates[archetype]['quote']
    
    def _calculate_data_points(self, user_data: List[Dict]) -> Dict:
        """Calculate supporting data points"""
        
        return {
            'sample_size': len(user_data),
            'confidence_level': 'High' if len(user_data) > 50 else 'Medium' if len(user_data) > 20 else 'Low',
            'last_updated': 'Current',
            'validation_method': 'Quantitative analysis + Qualitative interviews'
        }
    
    def _derive_design_implications(self, patterns: Dict) -> List[str]:
        """Derive design implications from persona"""
        
        implications = []
        
        # Based on frequency
        if patterns['usage_frequency'].get('daily', 0) > patterns['usage_frequency'].get('weekly', 0):
            implications.append('Optimize for speed and efficiency')
            implications.append('Provide keyboard shortcuts and power features')
        else:
            implications.append('Focus on discoverability and guidance')
            implications.append('Simplify onboarding experience')
        
        # Based on device
        if patterns['devices'].get('mobile', 0) > 0:
            implications.append('Mobile-first responsive design')
            implications.append('Touch-optimized interactions')
        
        # Based on context
        if patterns['contexts'].get('work', 0) > patterns['contexts'].get('personal', 0):
            implications.append('Professional visual design')
            implications.append('Enterprise features (SSO, audit logs)')
        
        return implications[:5]
    
    def format_persona_output(self, persona: Dict) -> str:
        """Format persona for display"""
        
        output = []
        output.append("=" * 60)
        output.append(f"PERSONA: {persona['name']}")
        output.append("=" * 60)
        output.append(f"\n📝 {persona['tagline']}\n")
        
        output.append(f"Archetype: {persona['archetype'].replace('_', ' ').title()}")
        output.append(f"Quote: \"{persona['quote']}\"\n")
        
        output.append("👤 Demographics:")
        for key, value in persona['demographics'].items():
            if value:
                output.append(f"  • {key.replace('_', ' ').title()}: {value}")
        
        output.append("\n🧠 Psychographics:")
        if persona['psychographics']['motivations']:
            output.append(f"  Motivations: {', '.join(persona['psychographics']['motivations'])}")
        if persona['psychographics']['values']:
            output.append(f"  Values: {', '.join(persona['psychographics']['values'])}")
        
        output.append("\n🎯 Goals & Needs:")
        for goal in persona['needs_and_goals'].get('primary_goals', [])[:3]:
            output.append(f"  • {goal}")
        
        output.append("\n😤 Frustrations:")
        for frustration in persona['frustrations'][:3]:
            output.append(f"  • {frustration}")
        
        output.append("\n📊 Behaviors:")
        for pref in persona['behaviors'].get('feature_preferences', [])[:3]:
            output.append(f"  • Frequently uses: {pref}")
        
        output.append("\n💡 Design Implications:")
        for implication in persona['design_implications']:
            output.append(f"  → {implication}")
        
        output.append(f"\n📈 Data: Based on {persona['data_points']['sample_size']} users")
        output.append(f"    Confidence: {persona['data_points']['confidence_level']}")
        
        return "\n".join(output)

def create_sample_user_data():
    """Create sample user data for testing"""
    return [
        {
            'user_id': f'user_{i}',
            'age': 25 + (i % 30),
            'usage_frequency': ['daily', 'weekly', 'monthly'][i % 3],
            'features_used': ['dashboard', 'reports', 'settings', 'sharing', 'export'][:3 + (i % 3)],
            'primary_device': ['desktop', 'mobile', 'tablet'][i % 3],
            'usage_context': ['work', 'personal'][i % 2],
            'tech_proficiency': 3 + (i % 7),
            'pain_points': ['slow loading', 'confusing UI', 'missing features'][:(i % 3) + 1]
        }
        for i in range(30)
    ]

def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate a research-backed persona from bundled sample data.")
    parser.add_argument("format", nargs="?", choices=["json", "human"], default="human",
                        help="Output format (default: human).")
    parser.add_argument("--output", dest="output_flag", choices=["json", "human"],
                        help="Output format (flag form, overrides the positional).")
    parser.add_argument("--seed", type=int, default=42,
                        help="RNG seed for deterministic persona names (default: 42).")
    parser.add_argument("--sample", action="store_true",
                        help="Generate the bundled sample persona and exit 0 "
                             "(same as the default run; kept for harness smoke tests).")
    args = parser.parse_args()
    output = args.output_flag or args.format

    random.seed(args.seed)
    generator = PersonaGenerator()

    # Create sample data
    user_data = create_sample_user_data()
    
    # Optional interview insights
    interview_insights = [
        {
            'quotes': ["I need to see all my data in one place"],
            'motivations': ['Efficiency', 'Control'],
            'goals': ['Save time', 'Make better decisions']
        }
    ]
    
    # Generate persona
    persona = generator.generate_persona_from_data(user_data, interview_insights)
    
    # Output
    if output == 'json':
        print(json.dumps(persona, indent=2))
    else:
        print(generator.format_persona_output(persona))

if __name__ == "__main__":
    main()
