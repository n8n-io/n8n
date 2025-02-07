#!/bin/bash

# Create a temporary directory to store the package list
mkdir -p temp_n8n_nodes

# Change to the temporary directory
cd temp_n8n_nodes

# Search for all n8n-nodes packages and save to a file
echo "Searching for n8n-nodes packages..."
npm search n8n-nodes --json > n8n_packages.json

# Extract package names and install them
echo "Installing n8n-nodes packages..."
cat n8n_packages.json | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | grep '^n8n-nodes-' | while read package; do
    echo "Installing $package..."
    npm install "$package"
done

# Clean up
cd ..
rm -rf temp_n8n_nodes

echo "Installation complete!"
