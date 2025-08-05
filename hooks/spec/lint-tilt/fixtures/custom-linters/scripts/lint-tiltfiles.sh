#!/usr/bin/env bash
# Custom Tiltfile linter

echo "Running custom Tiltfile checks..."

# Check for required patterns
if ! grep -q "k8s_resource" Tiltfile; then
    echo "ERROR: Tiltfile must define at least one k8s_resource"
    exit 1
fi

echo "Custom Tiltfile checks passed"
exit 0