# Python Code Node - Local Execution

The Python Code node in n8n now uses local Python execution with virtual environments instead of Pyodide, providing significantly better performance and access to the full Python ecosystem.

## Overview

The new Python execution system provides:
- **Native performance** - 5-10x faster than the previous Pyodide implementation
- **Full Python standard library** access
- **Native C extensions** support (NumPy, Pandas, TensorFlow, etc.)
- **File system access** for data processing workflows
- **Virtual environment isolation** for package management
- **Enhanced security** through sandboxing and Docker containers

## Requirements

### System Requirements
- Python 3.8+ installed on the system
- Virtual environment support (`python -m venv`)
- Docker (optional, for enhanced security)

### Environment Variables

Configure the Python execution environment using these environment variables:

```bash
# Python Configuration
N8N_PYTHON_ENABLED=true                    # Enable/disable Python execution (default: true)
N8N_PYTHON_PATH=/usr/bin/python3           # Path to Python executable (default: python3)
N8N_PYTHON_VENV_DIR=/opt/n8n/venvs         # Directory for virtual environments (default: .venvs)
N8N_PYTHON_MAX_EXECUTION_TIME=30000        # Maximum execution time in ms (default: 30000)
N8N_PYTHON_MAX_VENVS=10                    # Maximum cached virtual environments (default: 10)

# Security Configuration
N8N_BLOCK_ENV_ACCESS_IN_NODE=true          # Block environment variable access (default: false)
N8N_PYTHON_SANDBOX=true                    # Enable sandboxing (default: true)
```

## Security Model

### Sandboxing Features
- **Blocked system functions**: `os.system()`, `subprocess.*`, file deletion operations
- **Environment isolation**: Limited access to environment variables
- **Virtual environment isolation**: Each workflow uses isolated Python environments
- **Resource limits**: Execution time and memory constraints
- **Docker containers**: Optional containerized execution for enhanced security

### Blocked Operations
```python
# These operations are blocked for security
import os
import subprocess

os.system("rm -rf /")           # ❌ Blocked
subprocess.run(["ls", "/"])     # ❌ Blocked
os.remove("/important/file")    # ❌ Blocked

# File operations are restricted
with open("/etc/passwd", "w"):  # ❌ Blocked for dangerous modes
    pass
```

## Usage Examples

### Basic Data Processing
```python
# Access n8n context variables
for item in items:
    # Process each item
    item['processed_date'] = datetime.now().isoformat()
    item['total_value'] = item.get('quantity', 0) * item.get('price', 0)

# Return processed items
items
```

### Using External Libraries
```python
import pandas as pd
import numpy as np

# Convert n8n data to DataFrame
df = pd.DataFrame([item['json'] for item in items])

# Perform data analysis
df['moving_average'] = df['value'].rolling(window=5).mean()
df['outlier'] = np.abs(df['value'] - df['value'].mean()) > 2 * df['value'].std()

# Return results
[{'json': row.to_dict()} for _, row in df.iterrows()]
```

### File Processing
```python
import json
from pathlib import Path

# Process uploaded files
results = []
for item in items:
    if 'file_path' in item:
        # Read and process file
        with open(item['file_path'], 'r') as f:
            data = json.load(f)
            
        # Process data
        processed = {
            'filename': Path(item['file_path']).name,
            'record_count': len(data),
            'summary': analyze_data(data)
        }
        results.append(processed)

results
```

## Virtual Environment Management

### Automatic Package Installation
The system automatically creates and manages virtual environments based on your code's imports:

```python
# These imports will trigger automatic package installation
import requests      # requests package will be installed
import pandas as pd  # pandas package will be installed
import numpy as np   # numpy package will be installed

# Use the packages normally
response = requests.get('https://api.example.com/data')
df = pd.DataFrame(response.json())
processed = np.array(df['values'])
```

### Common Packages Available
- **Data Science**: pandas, numpy, scipy, matplotlib, seaborn, plotly, scikit-learn
- **Web**: requests, beautifulsoup4, selenium
- **Database**: psycopg2, PyMySQL, sqlite3
- **Files**: openpyxl, xlsxwriter, python-docx, PyPDF2
- **Text**: nltk, textblob
- **Crypto**: cryptography, passlib
- **Images**: Pillow

## Performance Comparison

| Aspect | Pyodide (Old) | Local Python (New) |
|--------|---------------|-------------------|
| Execution Speed | 1x (baseline) | 5-10x faster |
| Memory Usage | High (WASM overhead) | Native |
| Package Support | Limited | Full ecosystem |
| C Extensions | No | Yes |
| File System | Emulated | Native |
| Startup Time | Slow (loading WASM) | Fast |

## Migration Guide

### From Pyodide to Local Python

Most existing Python Code nodes will work without changes. However, some differences to note:

#### Removed Limitations
- ✅ Full Python standard library now available
- ✅ Native C extensions work (NumPy, Pandas, etc.)
- ✅ File system access enabled
- ✅ Better performance and memory usage

#### Code Changes Required
```python
# Old: Limited to Pyodide packages
# Some packages weren't available

# New: Full Python ecosystem
import tensorflow as tf  # Now works!
import torch            # Now works!
import cv2              # Now works!
```

#### Context Variables
Context variables remain the same:
- `items` - Array of input items (runOnceForAllItems mode)
- `item` - Current item (runOnceForEachItem mode)
- `$input` - Input data accessor
- `$json` - JSON utilities
- `$binary` - Binary data utilities

## Docker Deployment

### Enhanced Security with Docker
For production deployments, use Docker containers for additional security:

```bash
# Build the Python executor image
docker build -t n8n-python-executor ./docker/python-executor/

# Run n8n with Python Docker execution
docker run -d \
  -e N8N_PYTHON_DOCKER_IMAGE=n8n-python-executor \
  -e N8N_PYTHON_USE_DOCKER=true \
  -v /var/run/docker.sock:/var/run/docker.sock \
  n8n:latest
```

### Docker Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  n8n:
    image: n8n:latest
    environment:
      - N8N_PYTHON_USE_DOCKER=true
      - N8N_PYTHON_DOCKER_IMAGE=n8n-python-executor
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - n8n_data:/home/node/.n8n
```

## Troubleshooting

### Common Issues

#### Python Not Found
```bash
# Error: Python executable not found
# Solution: Install Python or set correct path
export N8N_PYTHON_PATH=/usr/local/bin/python3
```

#### Package Installation Failures
```bash
# Error: Package installation failed
# Solution: Check network access and package names
# Ensure pip is available in the Python environment
```

#### Permission Errors
```bash
# Error: Permission denied creating virtual environments
# Solution: Check directory permissions
chmod 755 /opt/n8n/venvs
```

#### Memory Issues
```bash
# Error: Out of memory during execution
# Solution: Increase container memory or optimize code
# Consider processing data in smaller chunks
```

### Performance Optimization

#### Batch Processing
```python
# Instead of processing one item at a time
for item in items:
    result = expensive_operation(item)

# Process in batches
import numpy as np
batch_size = 100
batches = np.array_split(items, len(items) // batch_size + 1)
results = []
for batch in batches:
    batch_results = process_batch(batch)
    results.extend(batch_results)
```

#### Memory Management
```python
# Clear large variables when done
del large_dataframe
import gc
gc.collect()
```

## Best Practices

### Code Organization
```python
# Use functions for reusable code
def process_item(item):
    # Processing logic here
    return processed_item

# Main execution
results = [process_item(item) for item in items]
```

### Error Handling
```python
import logging

results = []
for item in items:
    try:
        processed = process_item(item)
        results.append(processed)
    except Exception as e:
        logging.error(f"Failed to process item {item.get('id', 'unknown')}: {e}")
        # Optionally continue with error marked
        results.append({'error': str(e), 'original': item})
```

### Resource Management
```python
# Use context managers for file operations
with open(file_path, 'r') as f:
    data = f.read()

# Clean up temporary files
import tempfile
import os
with tempfile.NamedTemporaryFile(delete=False) as tmp:
    # Use temporary file
    tmp_path = tmp.name
# Clean up
os.unlink(tmp_path)
```

## Support

For issues related to Python Code node execution:
1. Check the n8n logs for Python execution errors
2. Verify Python installation and virtual environment creation
3. Test package installation manually in the virtual environment
4. Review security settings and sandboxing configuration

For feature requests or bug reports, please use the n8n GitHub repository.