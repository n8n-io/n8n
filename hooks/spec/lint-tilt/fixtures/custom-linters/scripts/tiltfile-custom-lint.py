#!/usr/bin/env python3
# Custom Python-based Tiltfile linter

import sys
import re

def check_tiltfile(filename):
    """Check Tiltfile for custom rules."""
    with open(filename, 'r') as f:
        content = f.read()
    
    errors = []
    
    # Check for health check endpoints
    if 'k8s_resource' in content and 'readiness_probe' not in content:
        errors.append("WARNING: k8s_resource should have readiness_probe")
    
    # Check for hardcoded ports
    if re.search(r'port_forwards\s*=\s*\d{4,5}', content):
        errors.append("INFO: Consider using config for port numbers")
    
    return errors

if __name__ == '__main__':
    errors = check_tiltfile('Tiltfile')
    
    for error in errors:
        print(error)
    
    # Exit with error if critical issues found
    sys.exit(1 if any('ERROR' in e for e in errors) else 0)