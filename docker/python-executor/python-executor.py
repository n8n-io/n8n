#!/usr/bin/env python3
"""
Python Executor Script for n8n
This script provides a secure execution environment for Python code within Docker containers.
It handles context injection, result capture, and security restrictions.
"""

import json
import sys
import os
import traceback
from io import StringIO
from typing import Any, Dict

def blocked_function(*args, **kwargs):
    """Security function to block dangerous operations"""
    raise RuntimeError("Function blocked for security reasons")

def setup_security_restrictions():
    """Set up security restrictions to prevent dangerous operations"""
    # Block file system operations that could be dangerous
    import builtins
    
    # Override dangerous built-in functions
    builtins.open = lambda *args, **kwargs: blocked_function() if any(
        mode in str(kwargs.get('mode', args[1] if len(args) > 1 else 'r'))
        for mode in ['w', 'a', 'x', '+']
    ) else builtins.__dict__['__orig_open__'](*args, **kwargs)
    
    # Store original open function
    builtins.__dict__['__orig_open__'] = builtins.open
    
    # Block subprocess and os system functions
    import subprocess
    import os
    
    os.system = blocked_function
    os.popen = blocked_function
    os.remove = blocked_function
    os.rmdir = blocked_function
    os.removedirs = blocked_function
    os.chmod = blocked_function
    os.chown = blocked_function
    
    subprocess.run = blocked_function
    subprocess.call = blocked_function
    subprocess.check_call = blocked_function
    subprocess.check_output = blocked_function
    subprocess.Popen = blocked_function

def execute_user_code(code: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute user Python code with provided context
    
    Args:
        code: Python code to execute
        context: Dictionary of variables to make available to the code
        
    Returns:
        Dictionary containing execution result and output
    """
    # Set up security restrictions
    setup_security_restrictions()
    
    # Capture stdout
    original_stdout = sys.stdout
    captured_output = StringIO()
    sys.stdout = captured_output
    
    # Prepare execution environment
    exec_globals = {
        '__builtins__': __builtins__,
        # Add common imports that are safe
        'json': json,
        'math': __import__('math'),
        'datetime': __import__('datetime'),
        'time': __import__('time'),
        're': __import__('re'),
        'random': __import__('random'),
        'collections': __import__('collections'),
        'itertools': __import__('itertools'),
        'functools': __import__('functools'),
    }
    
    # Add context variables
    exec_globals.update(context)
    
    result = None
    error = None
    
    try:
        # Execute the user code
        exec_result = exec(code, exec_globals)
        
        # Try to capture result if user assigned to a specific variable
        if '__n8n_result__' in exec_globals:
            result = exec_globals['__n8n_result__']
        elif 'result' in exec_globals:
            result = exec_globals['result']
        else:
            # If no explicit result, try to evaluate the last expression
            # This is a simplified approach - in production, you might want to parse the AST
            lines = code.strip().split('\n')
            if lines:
                last_line = lines[-1].strip()
                if last_line and not last_line.startswith(('if ', 'for ', 'while ', 'def ', 'class ', 'import ', 'from ', 'try:', 'except:', 'finally:', 'with ')):
                    try:
                        result = eval(last_line, exec_globals)
                    except:
                        # If evaluation fails, just use None
                        pass
                        
    except Exception as e:
        error = {
            'type': type(e).__name__,
            'message': str(e),
            'traceback': traceback.format_exc()
        }
    
    finally:
        # Restore stdout
        sys.stdout = original_stdout
    
    # Get captured output
    output = captured_output.getvalue()
    
    return {
        'result': result,
        'output': output,
        'error': error
    }

def main():
    """Main execution function"""
    if len(sys.argv) < 2:
        print("Usage: python-executor.py <code_file>", file=sys.stderr)
        sys.exit(1)
    
    code_file = sys.argv[1]
    
    try:
        # Read the code file
        with open(code_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse the file content to extract code and context
        lines = content.split('\n')
        
        # Find the context section (JSON between markers)
        context_start = -1
        context_end = -1
        code_start = -1
        
        for i, line in enumerate(lines):
            if line.strip() == '# N8N_CONTEXT_START':
                context_start = i + 1
            elif line.strip() == '# N8N_CONTEXT_END':
                context_end = i
            elif line.strip() == '# N8N_CODE_START':
                code_start = i + 1
                break
        
        # Extract context
        context = {}
        if context_start >= 0 and context_end >= 0:
            context_json = '\n'.join(lines[context_start:context_end])
            if context_json.strip():
                context = json.loads(context_json)
        
        # Extract code
        code = ''
        if code_start >= 0:
            code = '\n'.join(lines[code_start:])
        else:
            # If no markers found, treat entire content as code
            code = content
        
        # Execute the code
        execution_result = execute_user_code(code, context)
        
        # Print output if any
        if execution_result['output']:
            print(execution_result['output'], end='')
        
        # Print result in parseable format
        if execution_result['error']:
            print(f"__N8N_ERROR__:{json.dumps(execution_result['error'])}", file=sys.stderr)
            sys.exit(1)
        else:
            print(f"__N8N_RESULT__:{json.dumps(execution_result['result'])}")
            
    except Exception as e:
        error = {
            'type': type(e).__name__,
            'message': str(e),
            'traceback': traceback.format_exc()
        }
        print(f"__N8N_ERROR__:{json.dumps(error)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()