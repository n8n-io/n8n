#!/bin/bash
# Technical Writer Skill Validation Script
# Validates documentation for best practices and completeness

set -e

ERRORS=0
WARNINGS=0

echo "═══════════════════════════════════════════════════════════════"
echo "Technical Writer Skill Validator"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check README
check_readme() {
    echo "📖 Checking README files..."

    for readme in README.md README.rst readme.md; do
        [ -f "$readme" ] || continue

        echo "  Found $readme"

        # Check for required sections
        if ! grep -qi "## Installation\|## Quick Start\|## Getting Started" "$readme" 2>/dev/null; then
            echo "⚠️  WARN: $readme missing installation/quick start section"
            ((WARNINGS++))
        fi

        # Check for code examples
        if ! grep -q '```' "$readme" 2>/dev/null; then
            echo "⚠️  WARN: $readme has no code examples"
            ((WARNINGS++))
        fi

        # Check for license info
        if ! grep -qi "license" "$readme" 2>/dev/null; then
            echo "⚠️  WARN: $readme missing license information"
            ((WARNINGS++))
        fi

        # Check for broken markdown links
        while IFS= read -r line; do
            link=$(echo "$line" | grep -oE '\[.*\]\([^)]+\)' | head -1)
            file=$(echo "$link" | sed 's/.*(\([^)]*\)).*/\1/' | sed 's/#.*//')

            # Skip URLs
            if echo "$file" | grep -qE '^https?://'; then
                continue
            fi

            # Check if file exists
            if [ -n "$file" ] && [ ! -f "$file" ]; then
                echo "❌ ERROR: Broken link in $readme: $file"
                ((ERRORS++))
            fi
        done < "$readme"
    done
}

# Check documentation structure
check_docs_structure() {
    echo ""
    echo "📁 Checking documentation structure..."

    if [ -d "docs" ]; then
        echo "  Found docs/ directory"

        # Check for index/getting started
        if [ ! -f "docs/index.md" ] && [ ! -f "docs/getting-started.md" ]; then
            echo "⚠️  WARN: docs/ missing index.md or getting-started.md"
            ((WARNINGS++))
        fi

        # Count documentation files
        doc_count=$(find docs -name "*.md" 2>/dev/null | wc -l)
        echo "  Found $doc_count markdown files"

        if [ "$doc_count" -lt 3 ]; then
            echo "ℹ️  INFO: Consider adding more documentation"
        fi
    else
        echo "ℹ️  No docs/ directory found"
    fi
}

# Check for ADRs
check_adrs() {
    echo ""
    echo "📋 Checking Architecture Decision Records..."

    adr_dirs=("docs/adr" "docs/adrs" "adr" "docs/decisions")
    found_adr=false

    for dir in "${adr_dirs[@]}"; do
        if [ -d "$dir" ]; then
            found_adr=true
            adr_count=$(find "$dir" -name "*.md" 2>/dev/null | wc -l)
            echo "  Found $adr_count ADRs in $dir"

            # Check ADR format
            for adr in "$dir"/*.md; do
                [ -f "$adr" ] || continue

                if ! grep -qi "## Status" "$adr" 2>/dev/null; then
                    echo "⚠️  WARN: $adr missing Status section"
                    ((WARNINGS++))
                fi

                if ! grep -qi "## Context\|## Decision\|## Consequences" "$adr" 2>/dev/null; then
                    echo "⚠️  WARN: $adr missing required ADR sections"
                    ((WARNINGS++))
                fi
            done
        fi
    done

    if [ "$found_adr" = false ]; then
        echo "ℹ️  No ADR directory found (consider docs/adr/)"
    fi
}

# Check API documentation
check_api_docs() {
    echo ""
    echo "🔌 Checking API documentation..."

    if [ -f "openapi.yaml" ] || [ -f "openapi.yml" ] || [ -f "swagger.yaml" ]; then
        echo "  Found OpenAPI specification"
    fi

    if [ -f "docs/api-reference.md" ] || [ -d "docs/api" ]; then
        echo "  Found API documentation"

        # Check for required API doc elements
        for api_doc in docs/api*.md docs/api/*.md; do
            [ -f "$api_doc" ] || continue

            if ! grep -qi "## Authentication\|## Endpoints\|## Error" "$api_doc" 2>/dev/null; then
                echo "⚠️  WARN: $api_doc may be missing key sections (Authentication, Endpoints, Errors)"
                ((WARNINGS++))
            fi
        done
    fi
}

# Check for runbooks
check_runbooks() {
    echo ""
    echo "📕 Checking runbooks..."

    runbook_dirs=("docs/runbooks" "runbooks" "docs/operations")

    for dir in "${runbook_dirs[@]}"; do
        if [ -d "$dir" ]; then
            runbook_count=$(find "$dir" -name "*.md" 2>/dev/null | wc -l)
            echo "  Found $runbook_count runbooks in $dir"

            for runbook in "$dir"/*.md; do
                [ -f "$runbook" ] || continue

                # Check for required runbook sections
                if ! grep -qi "## Prerequisites\|## Procedure" "$runbook" 2>/dev/null; then
                    echo "⚠️  WARN: $runbook missing Prerequisites or Procedure section"
                    ((WARNINGS++))
                fi

                # Check for rollback section (critical for ops)
                if ! grep -qi "## Rollback\|## Recovery" "$runbook" 2>/dev/null; then
                    echo "⚠️  WARN: $runbook missing Rollback section"
                    ((WARNINGS++))
                fi
            done
        fi
    done
}

# Check changelog
check_changelog() {
    echo ""
    echo "📝 Checking changelog..."

    if [ -f "CHANGELOG.md" ]; then
        echo "  Found CHANGELOG.md"

        # Check for Keep a Changelog format
        if grep -qi "## \[Unreleased\]\|## \[[0-9]" CHANGELOG.md 2>/dev/null; then
            echo "  ✅ Follows Keep a Changelog format"
        else
            echo "⚠️  WARN: CHANGELOG.md may not follow Keep a Changelog format"
            ((WARNINGS++))
        fi
    else
        echo "⚠️  WARN: No CHANGELOG.md found"
        ((WARNINGS++))
    fi
}

# Check for common documentation issues
check_common_issues() {
    echo ""
    echo "🔍 Checking for common issues..."

    # Check for TODO/FIXME in docs
    todo_count=$(grep -ri "TODO\|FIXME\|TBD" docs/ README.md 2>/dev/null | wc -l)
    if [ "$todo_count" -gt 0 ]; then
        echo "⚠️  WARN: Found $todo_count TODO/FIXME/TBD markers in documentation"
        ((WARNINGS++))
    fi

    # Check for placeholder text
    placeholder_count=$(grep -ri "lorem ipsum\|example.com\|foo@bar" docs/ README.md 2>/dev/null | wc -l)
    if [ "$placeholder_count" -gt 5 ]; then
        echo "⚠️  WARN: Found $placeholder_count instances of placeholder text"
        ((WARNINGS++))
    fi

    # Check for very short files (likely incomplete)
    for doc in docs/*.md; do
        [ -f "$doc" ] || continue
        lines=$(wc -l < "$doc")
        if [ "$lines" -lt 10 ]; then
            echo "⚠️  WARN: $doc is very short ($lines lines) - may be incomplete"
            ((WARNINGS++))
        fi
    done
}

# Run all checks
check_readme
check_docs_structure
check_adrs
check_api_docs
check_runbooks
check_changelog
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
    echo "❌ Validation FAILED - fix errors before publishing"
    exit 1
elif [ $WARNINGS -gt 5 ]; then
    echo "⚠️  Validation PASSED with warnings - review recommended"
    exit 0
else
    echo "✅ Validation PASSED"
    exit 0
fi
