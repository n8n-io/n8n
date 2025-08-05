#!/usr/bin/env bash
# Claude Hooks Integration Assistant
# Analyzes your project and generates the perfect prompt for Claude

set -euo pipefail

# Source common helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common-helpers.sh
source "$SCRIPT_DIR/common-helpers.sh"

# Project analysis functions
detect_languages() {
    local languages=()
    
    # Go detection
    if find . -name "go.mod" -o -name "*.go" | grep -q .; then
        languages+=("go")
    fi
    
    # Python detection
    if find . -name "requirements.txt" -o -name "setup.py" -o -name "pyproject.toml" -o -name "*.py" | grep -q .; then
        languages+=("python")
    fi
    
    # JavaScript/TypeScript detection
    if find . -name "package.json" -o -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | grep -q .; then
        languages+=("javascript")
    fi
    
    # Tilt detection
    if find . -name "Tiltfile" -o -name "*.tiltfile" | grep -q .; then
        languages+=("tilt")
    fi
    
    echo "${languages[@]}"
}

detect_project_structure() {
    local structure="single"
    
    # Monorepo detection
    if [[ -d "services" ]] || [[ -d "packages" ]] || [[ -d "apps" ]]; then
        structure="monorepo"
    fi
    
    # Check for multiple go.mod files
    local go_mod_count
    go_mod_count=$(find . -name "go.mod" | wc -l)
    if [[ $go_mod_count -gt 1 ]]; then
        structure="monorepo"
    fi
    
    echo "$structure"
}

detect_build_tools() {
    local tools=()
    
    [[ -f "Makefile" ]] && tools+=("make")
    [[ -f "package.json" ]] && tools+=("npm")
    [[ -f "go.mod" ]] && tools+=("go")
    [[ -f "requirements.txt" ]] && tools+=("pip")
    [[ -f "Tiltfile" ]] && tools+=("tilt")
    
    echo "${tools[@]}"
}

analyze_go_projects() {
    local projects=()
    
    # Find all Go modules
    while IFS= read -r -d '' go_mod; do
        local dir
        dir=$(dirname "$go_mod")
        # Get relative path from current directory
        dir=$(realpath --relative-to="." "$dir")
        [[ "$dir" == "." ]] && dir="root" 
        projects+=("$dir")
    done < <(find . -name "go.mod" -print0)
    
    echo "${projects[@]}"
}

analyze_tilt_projects() {
    local projects=()
    
    # Find all Tiltfiles
    while IFS= read -r -d '' tiltfile; do
        local dir
        dir=$(dirname "$tiltfile")
        # Get relative path from current directory
        dir=$(realpath --relative-to="." "$dir")
        [[ "$dir" == "." ]] && dir="root"
        projects+=("$dir")
    done < <(find . \( -name "Tiltfile" -o -name "*.tiltfile" \) -print0)
    
    echo "${projects[@]}"
}

generate_prompt() {
    local languages=("$@")
    local structure
    structure=$(detect_project_structure)
    
    echo "=== COPY THIS PROMPT TO CLAUDE ==="
    echo ""
    echo "Please integrate Claude Code hooks into this project by updating the Makefile according to ~/.claude/hooks/INTEGRATION.md."
    echo ""
    echo "Project analysis:"
    echo "- Structure: $structure project"
    echo "- Languages detected: ${languages[*]}"
    
    if [[ "$structure" == "monorepo" ]]; then
        echo ""
        echo "Specific requirements for this monorepo:"
        
        # Go projects
        local go_projects
        mapfile -t go_projects < <(analyze_go_projects | tr ' ' '\n')
        if [[ ${#go_projects[@]} -gt 0 ]]; then
            echo ""
            echo "Go modules found in:"
            for proj in "${go_projects[@]}"; do
                echo "  - $proj"
            done
            echo ""
            echo "When any Go file in a module is changed, run lints (including gofmt and deadcode) and tests for ALL files in that specific module only."
        fi
        
        # Tilt projects
        local tilt_projects
        mapfile -t tilt_projects < <(analyze_tilt_projects | tr ' ' '\n')
        if [[ ${#tilt_projects[@]} -gt 0 ]]; then
            echo ""
            echo "Tilt projects found in:"
            for proj in "${tilt_projects[@]}"; do
                echo "  - $proj"
            done
            echo ""
            echo "When a Tiltfile is changed, run Tilt-specific lints and tests for that project. Reference ~/.claude/hooks/test-tilt.sh and ~/.claude/hooks/lint-tilt.sh for Tilt testing patterns."
        fi
    else
        echo ""
        echo "Requirements:"
        echo "- Add 'make lint' target that runs appropriate linters for: ${languages[*]}"
        echo "- Add 'make test' target that runs tests for all languages"
        echo "- Ensure FILE parameter is handled correctly for focused operations"
    fi
    
    echo ""
    echo "Key integration points:"
    echo "1. The Makefile must accept FILE=path/to/file for targeted operations"
    echo "2. Exit codes must be preserved (0 for success, non-zero for failure)"
    echo "3. All output goes to stderr"
    
    if [[ ! -f "Makefile" ]]; then
        echo ""
        echo "Note: No Makefile exists yet. Create one based on ~/.claude/hooks/example-Makefile"
    fi
    
    echo ""
    echo "=== END OF PROMPT ==="
}

main() {
    log_info "🔍 Analyzing project structure..."
    
    local languages
    mapfile -t languages < <(detect_languages | tr ' ' '\n')
    
    if [[ ${#languages[@]} -eq 0 ]]; then
        log_error "No supported languages detected in this project"
        exit 1
    fi
    
    log_success "Detected languages: ${languages[*]}"
    
    echo ""
    generate_prompt "${languages[@]}"
    
    echo ""
    log_info "💡 Tips:"
    echo "  1. Copy the prompt above and paste it to Claude"
    echo "  2. Review the generated Makefile before accepting"
    echo "  3. Test with: make lint && make test"
    echo "  4. For custom configuration, see: ~/.claude/hooks/example-claude-hooks-config.sh"
}

main "$@"