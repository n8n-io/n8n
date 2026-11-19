#!/bin/bash
# API Architect Skill Validation Script
# Validates API specifications for common issues and best practices

set -e

ERRORS=0
WARNINGS=0

echo "═══════════════════════════════════════════════════════════════"
echo "API Architect Skill Validator"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check for OpenAPI specifications
check_openapi() {
    echo "📋 Checking OpenAPI specifications..."

    for spec in *.yaml *.yml openapi/*.yaml openapi/*.yml api/*.yaml api/*.yml; do
        [ -f "$spec" ] || continue

        # Check if it's an OpenAPI file
        if ! grep -q "openapi:" "$spec" 2>/dev/null; then
            continue
        fi

        echo "  Checking: $spec"

        # Check for version
        if ! grep -qE "openapi:\s*(3\.[0-9]+\.[0-9]+)" "$spec" 2>/dev/null; then
            echo "⚠️  WARN: $spec may be using outdated OpenAPI version (prefer 3.0+)"
            ((WARNINGS++))
        fi

        # Check for info section
        if ! grep -q "^info:" "$spec" 2>/dev/null; then
            echo "❌ ERROR: $spec missing info section"
            ((ERRORS++))
        fi

        # Check for servers
        if ! grep -q "^servers:" "$spec" 2>/dev/null; then
            echo "⚠️  WARN: $spec missing servers section"
            ((WARNINGS++))
        fi

        # Check for security schemes
        if ! grep -q "securitySchemes:" "$spec" 2>/dev/null; then
            echo "⚠️  WARN: $spec missing security schemes"
            ((WARNINGS++))
        fi

        # Check for operationId
        if grep -q "get:\|post:\|put:\|patch:\|delete:" "$spec" 2>/dev/null; then
            if ! grep -q "operationId:" "$spec" 2>/dev/null; then
                echo "⚠️  WARN: $spec missing operationId (required for SDK generation)"
                ((WARNINGS++))
            fi
        fi

        # Check for verb-based paths (anti-pattern)
        if grep -qE "/get[A-Z]|/create[A-Z]|/update[A-Z]|/delete[A-Z]" "$spec" 2>/dev/null; then
            echo "❌ ERROR: $spec contains verb-based URLs (use nouns, let HTTP methods convey action)"
            ((ERRORS++))
        fi

        # Check for consistent error schemas
        if grep -q "responses:" "$spec" 2>/dev/null; then
            if ! grep -qE "'4[0-9]{2}':|\"4[0-9]{2}\":" "$spec" 2>/dev/null; then
                echo "⚠️  WARN: $spec missing 4xx error responses"
                ((WARNINGS++))
            fi
        fi
    done
}

# Check GraphQL schemas
check_graphql() {
    echo ""
    echo "🔷 Checking GraphQL schemas..."

    for schema in *.graphql schema/*.graphql graphql/*.graphql; do
        [ -f "$schema" ] || continue

        echo "  Checking: $schema"

        # Check for Query type
        if ! grep -q "type Query" "$schema" 2>/dev/null; then
            echo "❌ ERROR: $schema missing Query type"
            ((ERRORS++))
        fi

        # Check for Relay-style pagination
        if grep -q "type.*Connection" "$schema" 2>/dev/null; then
            if ! grep -q "type PageInfo" "$schema" 2>/dev/null; then
                echo "⚠️  WARN: $schema has Connection types but missing PageInfo"
                ((WARNINGS++))
            fi
        fi

        # Check for mutation payloads with errors
        if grep -q "type Mutation" "$schema" 2>/dev/null; then
            if ! grep -qE "errors:\s*\[" "$schema" 2>/dev/null; then
                echo "⚠️  WARN: $schema mutations should return error arrays in payloads"
                ((WARNINGS++))
            fi
        fi

        # Check for custom scalars
        if grep -qE "DateTime|Date|JSON|UUID" "$schema" 2>/dev/null; then
            if ! grep -q "scalar DateTime\|scalar Date\|scalar JSON\|scalar UUID" "$schema" 2>/dev/null; then
                echo "⚠️  WARN: $schema uses custom types without scalar definitions"
                ((WARNINGS++))
            fi
        fi
    done
}

# Check Protocol Buffer definitions
check_protobuf() {
    echo ""
    echo "🔌 Checking Protocol Buffer definitions..."

    for proto in *.proto proto/*.proto; do
        [ -f "$proto" ] || continue

        echo "  Checking: $proto"

        # Check for syntax version
        if ! grep -q 'syntax = "proto3"' "$proto" 2>/dev/null; then
            echo "⚠️  WARN: $proto not using proto3 syntax"
            ((WARNINGS++))
        fi

        # Check for package definition
        if ! grep -q "^package " "$proto" 2>/dev/null; then
            echo "❌ ERROR: $proto missing package definition"
            ((ERRORS++))
        fi

        # Check for go_package option
        if ! grep -q "option go_package" "$proto" 2>/dev/null; then
            echo "⚠️  WARN: $proto missing go_package option"
            ((WARNINGS++))
        fi

        # Check for field numbers > 0
        if grep -qE "=\s*0\s*;" "$proto" 2>/dev/null; then
            # Check if it's in an enum (0 is required for enums)
            if ! grep -B5 "= 0;" "$proto" | grep -q "enum" 2>/dev/null; then
                echo "❌ ERROR: $proto has field number 0 (must be positive for messages)"
                ((ERRORS++))
            fi
        fi
    done
}

# Check for common API design issues
check_common_issues() {
    echo ""
    echo "🔍 Checking for common API design issues..."

    # Check for hardcoded localhost/IP addresses
    for file in *.yaml *.yml *.json; do
        [ -f "$file" ] || continue

        if grep -qE "localhost|127\.0\.0\.1|0\.0\.0\.0" "$file" 2>/dev/null; then
            if ! echo "$file" | grep -qE "dev|local|test" 2>/dev/null; then
                echo "⚠️  WARN: $file contains localhost/IP (use environment variables)"
                ((WARNINGS++))
            fi
        fi
    done

    # Check for API versioning
    has_versioning=false
    if grep -rqE "/v[0-9]+/" *.yaml *.yml 2>/dev/null; then
        has_versioning=true
    fi
    if grep -rq "version:" *.yaml *.yml 2>/dev/null | grep -qE "header|query" 2>/dev/null; then
        has_versioning=true
    fi

    if [ "$has_versioning" = false ]; then
        echo "ℹ️  INFO: No API versioning strategy detected"
    fi
}

# Run all checks
check_openapi
check_graphql
check_protobuf
check_common_issues

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Validation Complete"
echo "═══════════════════════════════════════════════════════════════"
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo "❌ Validation FAILED - fix errors before publishing API"
    exit 1
elif [ $WARNINGS -gt 5 ]; then
    echo "⚠️  Validation PASSED with warnings - review recommended"
    exit 0
else
    echo "✅ Validation PASSED"
    exit 0
fi
