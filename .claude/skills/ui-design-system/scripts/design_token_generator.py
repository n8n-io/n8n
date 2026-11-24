#!/usr/bin/env python3
"""
Design Token Generator
Creates consistent design system tokens for colors, typography, spacing, and more.

Usage:
    python design_token_generator.py [brand_color] [style] [format]

    brand_color: Hex color (default: #0066CC)
    style: modern | classic | playful (default: modern)
    format: json | css | scss | summary (default: json)

Examples:
    python design_token_generator.py "#0066CC" modern json
    python design_token_generator.py "#8B4513" classic css
    python design_token_generator.py "#FF6B6B" playful summary

Table of Contents:
==================

CLASS: DesignTokenGenerator
    __init__()                      - Initialize base unit (8pt), type scale (1.25x)
    generate_complete_system()      - Main entry: generates all token categories
    generate_color_palette()        - Primary, secondary, neutral, semantic colors
    generate_typography_system()    - Font families, sizes, weights, line heights
    generate_spacing_system()       - 8pt grid-based spacing scale
    generate_sizing_tokens()        - Container and component sizing
    generate_border_tokens()        - Border radius and width values
    generate_shadow_tokens()        - Shadow definitions per style
    generate_animation_tokens()     - Durations, easing, keyframes
    generate_breakpoints()          - Responsive breakpoints (xs-2xl)
    generate_z_index_scale()        - Z-index layering system
    export_tokens()                 - Export to JSON/CSS/SCSS

PRIVATE METHODS:
    _generate_color_scale()         - Generate 10-step color scale (50-900)
    _generate_neutral_scale()       - Fixed neutral gray palette
    _generate_type_scale()          - Modular type scale using ratio
    _generate_text_styles()         - Pre-composed h1-h6, body, caption
    _export_as_css()                - CSS custom properties exporter
    _hex_to_rgb()                   - Hex to RGB conversion
    _rgb_to_hex()                   - RGB to Hex conversion
    _adjust_hue()                   - HSV hue rotation utility

FUNCTION: main()                    - CLI entry point with argument parsing

Token Categories Generated:
    - colors: primary, secondary, neutral, semantic, surface
    - typography: fontFamily, fontSize, fontWeight, lineHeight, letterSpacing
    - spacing: 0-64 scale based on 8pt grid
    - sizing: containers, buttons, inputs, icons
    - borders: radius (per style), width
    - shadows: none through 2xl, inner
    - animation: duration, easing, keyframes
    - breakpoints: xs, sm, md, lg, xl, 2xl
    - z-index: hide through notification
"""

import json
from typing import Dict, List, Tuple
import colorsys

class DesignTokenGenerator:
    """Generate comprehensive design system tokens"""
    
    def __init__(self):
        self.base_unit = 8  # 8pt grid system
        self.type_scale_ratio = 1.25  # Major third
        self.base_font_size = 16
        
    def generate_complete_system(self, brand_color: str = "#0066CC", 
                                style: str = "modern") -> Dict:
        """Generate complete design token system"""
        
        tokens = {
            'meta': {
                'version': '1.0.0',
                'style': style,
                'generated': 'auto-generated'
            },
            'colors': self.generate_color_palette(brand_color),
            'typography': self.generate_typography_system(style),
            'spacing': self.generate_spacing_system(),
            'sizing': self.generate_sizing_tokens(),
            'borders': self.generate_border_tokens(style),
            'shadows': self.generate_shadow_tokens(style),
            'animation': self.generate_animation_tokens(),
            'breakpoints': self.generate_breakpoints(),
            'z-index': self.generate_z_index_scale()
        }
        
        return tokens
    
    def generate_color_palette(self, brand_color: str) -> Dict:
        """Generate comprehensive color palette from brand color"""
        
        # Convert hex to RGB
        brand_rgb = self._hex_to_rgb(brand_color)
        brand_hsv = colorsys.rgb_to_hsv(*[c/255 for c in brand_rgb])
        
        palette = {
            'primary': self._generate_color_scale(brand_color, 'primary'),
            'secondary': self._generate_color_scale(
                self._adjust_hue(brand_color, 180), 'secondary'
            ),
            'neutral': self._generate_neutral_scale(),
            'semantic': {
                'success': {
                    'base': '#10B981',
                    'light': '#34D399',
                    'dark': '#059669',
                    'contrast': '#FFFFFF'
                },
                'warning': {
                    'base': '#F59E0B',
                    'light': '#FBBD24',
                    'dark': '#D97706',
                    'contrast': '#FFFFFF'
                },
                'error': {
                    'base': '#EF4444',
                    'light': '#F87171',
                    'dark': '#DC2626',
                    'contrast': '#FFFFFF'
                },
                'info': {
                    'base': '#3B82F6',
                    'light': '#60A5FA',
                    'dark': '#2563EB',
                    'contrast': '#FFFFFF'
                }
            },
            'surface': {
                'background': '#FFFFFF',
                'foreground': '#111827',
                'card': '#FFFFFF',
                'overlay': 'rgba(0, 0, 0, 0.5)',
                'divider': '#E5E7EB'
            }
        }
        
        return palette
    
    def _generate_color_scale(self, base_color: str, name: str) -> Dict:
        """Generate color scale from base color"""
        
        scale = {}
        rgb = self._hex_to_rgb(base_color)
        h, s, v = colorsys.rgb_to_hsv(*[c/255 for c in rgb])
        
        # Generate scale from 50 to 900
        steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
        
        for step in steps:
            # Adjust lightness based on step
            factor = (1000 - step) / 1000
            new_v = 0.95 if step < 500 else v * (1 - (step - 500) / 500)
            new_s = s * (0.3 + 0.7 * (step / 900))
            
            new_rgb = colorsys.hsv_to_rgb(h, new_s, new_v)
            scale[str(step)] = self._rgb_to_hex([int(c * 255) for c in new_rgb])
        
        scale['DEFAULT'] = base_color
        return scale
    
    def _generate_neutral_scale(self) -> Dict:
        """Generate neutral color scale"""
        
        return {
            '50': '#F9FAFB',
            '100': '#F3F4F6',
            '200': '#E5E7EB',
            '300': '#D1D5DB',
            '400': '#9CA3AF',
            '500': '#6B7280',
            '600': '#4B5563',
            '700': '#374151',
            '800': '#1F2937',
            '900': '#111827',
            'DEFAULT': '#6B7280'
        }
    
    def generate_typography_system(self, style: str) -> Dict:
        """Generate typography system"""
        
        # Font families based on style
        font_families = {
            'modern': {
                'sans': 'Inter, system-ui, -apple-system, sans-serif',
                'serif': 'Merriweather, Georgia, serif',
                'mono': 'Fira Code, Monaco, monospace'
            },
            'classic': {
                'sans': 'Helvetica, Arial, sans-serif',
                'serif': 'Times New Roman, Times, serif',
                'mono': 'Courier New, monospace'
            },
            'playful': {
                'sans': 'Poppins, Roboto, sans-serif',
                'serif': 'Playfair Display, Georgia, serif',
                'mono': 'Source Code Pro, monospace'
            }
        }
        
        typography = {
            'fontFamily': font_families.get(style, font_families['modern']),
            'fontSize': self._generate_type_scale(),
            'fontWeight': {
                'thin': 100,
                'light': 300,
                'normal': 400,
                'medium': 500,
                'semibold': 600,
                'bold': 700,
                'extrabold': 800,
                'black': 900
            },
            'lineHeight': {
                'none': 1,
                'tight': 1.25,
                'snug': 1.375,
                'normal': 1.5,
                'relaxed': 1.625,
                'loose': 2
            },
            'letterSpacing': {
                'tighter': '-0.05em',
                'tight': '-0.025em',
                'normal': '0',
                'wide': '0.025em',
                'wider': '0.05em',
                'widest': '0.1em'
            },
            'textStyles': self._generate_text_styles()
        }
        
        return typography
    
    def _generate_type_scale(self) -> Dict:
        """Generate modular type scale"""
        
        scale = {}
        sizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']
        
        for i, size in enumerate(sizes):
            if size == 'base':
                scale[size] = f'{self.base_font_size}px'
            elif i < sizes.index('base'):
                factor = self.type_scale_ratio ** (sizes.index('base') - i)
                scale[size] = f'{round(self.base_font_size / factor)}px'
            else:
                factor = self.type_scale_ratio ** (i - sizes.index('base'))
                scale[size] = f'{round(self.base_font_size * factor)}px'
        
        return scale
    
    def _generate_text_styles(self) -> Dict:
        """Generate pre-composed text styles"""
        
        return {
            'h1': {
                'fontSize': '48px',
                'fontWeight': 700,
                'lineHeight': 1.2,
                'letterSpacing': '-0.02em'
            },
            'h2': {
                'fontSize': '36px',
                'fontWeight': 700,
                'lineHeight': 1.3,
                'letterSpacing': '-0.01em'
            },
            'h3': {
                'fontSize': '28px',
                'fontWeight': 600,
                'lineHeight': 1.4,
                'letterSpacing': '0'
            },
            'h4': {
                'fontSize': '24px',
                'fontWeight': 600,
                'lineHeight': 1.4,
                'letterSpacing': '0'
            },
            'h5': {
                'fontSize': '20px',
                'fontWeight': 600,
                'lineHeight': 1.5,
                'letterSpacing': '0'
            },
            'h6': {
                'fontSize': '16px',
                'fontWeight': 600,
                'lineHeight': 1.5,
                'letterSpacing': '0.01em'
            },
            'body': {
                'fontSize': '16px',
                'fontWeight': 400,
                'lineHeight': 1.5,
                'letterSpacing': '0'
            },
            'small': {
                'fontSize': '14px',
                'fontWeight': 400,
                'lineHeight': 1.5,
                'letterSpacing': '0'
            },
            'caption': {
                'fontSize': '12px',
                'fontWeight': 400,
                'lineHeight': 1.5,
                'letterSpacing': '0.01em'
            }
        }
    
    def generate_spacing_system(self) -> Dict:
        """Generate spacing system based on 8pt grid"""
        
        spacing = {}
        multipliers = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 24, 32, 40, 48, 56, 64]
        
        for i, mult in enumerate(multipliers):
            spacing[str(i)] = f'{int(self.base_unit * mult)}px'
        
        # Add semantic spacing
        spacing.update({
            'xs': spacing['1'],    # 4px
            'sm': spacing['2'],    # 8px
            'md': spacing['4'],    # 16px
            'lg': spacing['6'],    # 24px
            'xl': spacing['8'],    # 32px
            '2xl': spacing['12'],  # 48px
            '3xl': spacing['16']   # 64px
        })
        
        return spacing
    
    def generate_sizing_tokens(self) -> Dict:
        """Generate sizing tokens for components"""
        
        return {
            'container': {
                'sm': '640px',
                'md': '768px',
                'lg': '1024px',
                'xl': '1280px',
                '2xl': '1536px'
            },
            'components': {
                'button': {
                    'sm': {'height': '32px', 'paddingX': '12px'},
                    'md': {'height': '40px', 'paddingX': '16px'},
                    'lg': {'height': '48px', 'paddingX': '20px'}
                },
                'input': {
                    'sm': {'height': '32px', 'paddingX': '12px'},
                    'md': {'height': '40px', 'paddingX': '16px'},
                    'lg': {'height': '48px', 'paddingX': '20px'}
                },
                'icon': {
                    'sm': '16px',
                    'md': '20px',
                    'lg': '24px',
                    'xl': '32px'
                }
            }
        }
    
    def generate_border_tokens(self, style: str) -> Dict:
        """Generate border tokens"""
        
        radius_values = {
            'modern': {
                'none': '0',
                'sm': '4px',
                'DEFAULT': '8px',
                'md': '12px',
                'lg': '16px',
                'xl': '24px',
                'full': '9999px'
            },
            'classic': {
                'none': '0',
                'sm': '2px',
                'DEFAULT': '4px',
                'md': '6px',
                'lg': '8px',
                'xl': '12px',
                'full': '9999px'
            },
            'playful': {
                'none': '0',
                'sm': '8px',
                'DEFAULT': '16px',
                'md': '20px',
                'lg': '24px',
                'xl': '32px',
                'full': '9999px'
            }
        }
        
        return {
            'radius': radius_values.get(style, radius_values['modern']),
            'width': {
                'none': '0',
                'thin': '1px',
                'DEFAULT': '1px',
                'medium': '2px',
                'thick': '4px'
            }
        }
    
    def generate_shadow_tokens(self, style: str) -> Dict:
        """Generate shadow tokens"""
        
        shadow_styles = {
            'modern': {
                'none': 'none',
                'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
            },
            'classic': {
                'none': 'none',
                'sm': '0 1px 2px rgba(0, 0, 0, 0.1)',
                'DEFAULT': '0 2px 4px rgba(0, 0, 0, 0.1)',
                'md': '0 4px 8px rgba(0, 0, 0, 0.1)',
                'lg': '0 8px 16px rgba(0, 0, 0, 0.1)',
                'xl': '0 16px 32px rgba(0, 0, 0, 0.1)'
            }
        }
        
        return shadow_styles.get(style, shadow_styles['modern'])
    
    def generate_animation_tokens(self) -> Dict:
        """Generate animation tokens"""
        
        return {
            'duration': {
                'instant': '0ms',
                'fast': '150ms',
                'DEFAULT': '250ms',
                'slow': '350ms',
                'slower': '500ms'
            },
            'easing': {
                'linear': 'linear',
                'ease': 'ease',
                'easeIn': 'ease-in',
                'easeOut': 'ease-out',
                'easeInOut': 'ease-in-out',
                'spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            },
            'keyframes': {
                'fadeIn': {
                    'from': {'opacity': 0},
                    'to': {'opacity': 1}
                },
                'slideUp': {
                    'from': {'transform': 'translateY(10px)', 'opacity': 0},
                    'to': {'transform': 'translateY(0)', 'opacity': 1}
                },
                'scale': {
                    'from': {'transform': 'scale(0.95)'},
                    'to': {'transform': 'scale(1)'}
                }
            }
        }
    
    def generate_breakpoints(self) -> Dict:
        """Generate responsive breakpoints"""
        
        return {
            'xs': '480px',
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px'
        }
    
    def generate_z_index_scale(self) -> Dict:
        """Generate z-index scale"""
        
        return {
            'hide': -1,
            'base': 0,
            'dropdown': 1000,
            'sticky': 1020,
            'overlay': 1030,
            'modal': 1040,
            'popover': 1050,
            'tooltip': 1060,
            'notification': 1070
        }
    
    def export_tokens(self, tokens: Dict, format: str = 'json') -> str:
        """Export tokens in various formats"""
        
        if format == 'json':
            return json.dumps(tokens, indent=2)
        elif format == 'css':
            return self._export_as_css(tokens)
        elif format == 'scss':
            return self._export_as_scss(tokens)
        else:
            return json.dumps(tokens, indent=2)
    
    def _export_as_css(self, tokens: Dict) -> str:
        """Export as CSS variables"""
        
        css = [':root {']
        
        def flatten_dict(obj, prefix=''):
            for key, value in obj.items():
                if isinstance(value, dict):
                    flatten_dict(value, f'{prefix}-{key}' if prefix else key)
                else:
                    css.append(f'  --{prefix}-{key}: {value};')
        
        flatten_dict(tokens)
        css.append('}')
        
        return '\n'.join(css)
    
    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex to RGB"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def _rgb_to_hex(self, rgb: List[int]) -> str:
        """Convert RGB to hex"""
        return '#{:02x}{:02x}{:02x}'.format(*rgb)
    
    def _adjust_hue(self, hex_color: str, degrees: int) -> str:
        """Adjust hue of color"""
        rgb = self._hex_to_rgb(hex_color)
        h, s, v = colorsys.rgb_to_hsv(*[c/255 for c in rgb])
        h = (h + degrees/360) % 1
        new_rgb = colorsys.hsv_to_rgb(h, s, v)
        return self._rgb_to_hex([int(c * 255) for c in new_rgb])

def main():
    import sys
    import argparse

    parser = argparse.ArgumentParser(
        description="Design Token Generator - Creates consistent design system tokens for colors, typography, spacing, and more."
    )
    parser.add_argument(
        "brand_color", nargs="?", default="#0066CC",
        help="Hex brand color (default: #0066CC)"
    )
    parser.add_argument(
        "--style", choices=["modern", "classic", "playful"], default="modern",
        help="Design style (default: modern)"
    )
    parser.add_argument(
        "--format", choices=["json", "css", "scss", "summary"], default="json",
        dest="output_format",
        help="Output format (default: json)"
    )
    args = parser.parse_args()

    generator = DesignTokenGenerator()
    tokens = generator.generate_complete_system(args.brand_color, args.style)

    if args.output_format == 'summary':
        print("=" * 60)
        print("DESIGN SYSTEM TOKENS")
        print("=" * 60)
        print(f"\n  Style: {args.style}")
        print(f"  Brand Color: {args.brand_color}")
        print("\n  Generated Tokens:")
        print(f"  - Colors: {len(tokens['colors'])} palettes")
        print(f"  - Typography: {len(tokens['typography'])} categories")
        print(f"  - Spacing: {len(tokens['spacing'])} values")
        print(f"  - Shadows: {len(tokens['shadows'])} styles")
        print(f"  - Breakpoints: {len(tokens['breakpoints'])} sizes")
        print("\n  Export formats available: json, css, scss")
    else:
        print(generator.export_tokens(tokens, args.output_format))

if __name__ == "__main__":
    main()
