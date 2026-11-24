#!/usr/bin/env node
/**
 * React Performance Audit Tool
 *
 * Analyzes React components for common performance issues.
 *
 * Usage: npx tsx performance_audit.ts [directory]
 *
 * Examples:
 *   npx tsx performance_audit.ts src/components
 *   npx tsx performance_audit.ts src/
 *
 * Checks for:
 * - Missing React.memo on expensive components
 * - Inline function definitions in JSX
 * - Missing useCallback/useMemo
 * - Large lists without virtualization
 * - Expensive operations in render
 */

import * as fs from 'fs';
import * as path from 'path';

interface PerformanceIssue {
  file: string;
  line: number;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  fix?: string;
}

class PerformanceAuditor {
  private issues: PerformanceIssue[] = [];
  private fileCount = 0;
  private componentCount = 0;

  auditDirectory(dir: string): void {
    const files = this.getReactFiles(dir);

    files.forEach(file => {
      this.auditFile(file);
    });
  }

  private getReactFiles(dir: string): string[] {
    const files: string[] = [];

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      entries.forEach(entry => {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, build, dist
          if (!['node_modules', 'build', 'dist', '.next'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          // React files: .tsx, .jsx
          if (/\.(tsx|jsx)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
      });
    };

    walk(dir);
    return files;
  }

  private auditFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    this.fileCount++;

    // Check for component definitions
    const componentMatches = content.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/g);
    if (componentMatches) {
      this.componentCount += componentMatches.length;
    }

    // Check each line
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Critical: Inline arrow functions in JSX
      if (this.hasInlineFunction(line) && this.isJSXLine(line)) {
        this.addIssue(filePath, lineNumber, 'critical', 'inline-function',
          'Inline arrow function in JSX creates new reference on every render',
          'Extract to useCallback or define outside render');
      }

      // Critical: Large array.map without virtualization
      if (this.hasUnvirtualizedList(line)) {
        this.addIssue(filePath, lineNumber, 'critical', 'unvirtualized-list',
          'Rendering large list without virtualization',
          'Use react-window or react-virtualized for lists >100 items');
      }

      // Warning: Component not wrapped in React.memo
      if (this.isPureComponent(line, content) && !this.hasMemo(content)) {
        this.addIssue(filePath, lineNumber, 'warning', 'missing-memo',
          'Pure component could benefit from React.memo',
          'Wrap component in React.memo to prevent unnecessary re-renders');
      }

      // Warning: Expensive computation in render
      if (this.hasExpensiveOperation(line) && !this.hasUseMemo(content, line)) {
        this.addIssue(filePath, lineNumber, 'warning', 'expensive-render',
          'Expensive operation in render without memoization',
          'Wrap in useMemo to avoid recomputing on every render');
      }

      // Info: useState for derived state
      if (this.hasDerivedState(line, lines, index)) {
        this.addIssue(filePath, lineNumber, 'info', 'derived-state',
          'Derived state should be computed from props/state, not stored',
          'Calculate during render or use useMemo if expensive');
      }
    });
  }

  private hasInlineFunction(line: string): boolean {
    // Matches: onClick={() => ...}, onChange={(e) => ...}
    return /\w+={(?:\([^)]*\)|[a-z])\s*=>/i.test(line);
  }

  private isJSXLine(line: string): boolean {
    return /<[A-Z]/.test(line) || /<[a-z]+\s/.test(line);
  }

  private hasUnvirtualizedList(line: string): boolean {
    // Matches: {items.map(...)} without FixedSizeList/VariableSizeList
    return /\{\s*\w+\.map\(/.test(line) &&
           !/FixedSizeList|VariableSizeList|VirtualList/.test(line);
  }

  private isPureComponent(line: string, content: string): boolean {
    // Component that only depends on props (no hooks, no state)
    const match = line.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/);
    if (!match) return false;

    const componentName = match[1];
    const componentBody = this.extractComponentBody(content, componentName);

    // Has no useState, useReducer, useContext
    return !/use(?:State|Reducer|Context)/.test(componentBody);
  }

  private hasMemo(content: string): boolean {
    return /React\.memo|memo\(/.test(content);
  }

  private hasExpensiveOperation(line: string): boolean {
    // Matches: .sort(), .filter().map(), new Date(), JSON.parse()
    return /\.sort\(|\.filter\([^)]+\)\.map\(|new Date\(|JSON\.parse\(/.test(line);
  }

  private hasUseMemo(content: string, line: string): boolean {
    // Check if this operation is already wrapped in useMemo
    const lines = content.split('\n');
    const currentIndex = lines.indexOf(line);

    // Look backwards for useMemo within 5 lines
    for (let i = Math.max(0, currentIndex - 5); i < currentIndex; i++) {
      if (/useMemo\(/.test(lines[i])) {
        return true;
      }
    }

    return false;
  }

  private hasDerivedState(line: string, lines: string[], index: number): boolean {
    // Matches: const [x, setX] = useState(computeFromProps(props))
    if (!/useState\(/.test(line)) return false;

    const stateInitializer = line.match(/useState\(([^)]+)\)/)?.[1];
    if (!stateInitializer) return false;

    // If initializer calls a function with props/state, it's likely derived
    return /(?:props|state)\.\w+/.test(stateInitializer);
  }

  private extractComponentBody(content: string, componentName: string): string {
    const regex = new RegExp(`(?:function|const)\\s+${componentName}[^{]*{([^}]+)}`, 's');
    const match = content.match(regex);
    return match ? match[1] : '';
  }

  private addIssue(
    file: string,
    line: number,
    severity: PerformanceIssue['severity'],
    type: string,
    message: string,
    fix?: string
  ): void {
    this.issues.push({ file, line, severity, type, message, fix });
  }

  report(): void {
    console.log('\n⚡ React Performance Audit Report\n');
    console.log('─'.repeat(80));
    console.log(`\nScanned ${this.fileCount} files, found ${this.componentCount} components\n`);

    if (this.issues.length === 0) {
      console.log('✅ No performance issues detected!\n');
      return;
    }

    const critical = this.issues.filter(i => i.severity === 'critical');
    const warnings = this.issues.filter(i => i.severity === 'warning');
    const info = this.issues.filter(i => i.severity === 'info');

    console.log(`Found ${critical.length} critical, ${warnings.length} warnings, ${info.length} suggestions\n`);

    if (critical.length > 0) {
      console.log('🔴 Critical Issues (fix immediately):\n');
      this.printIssues(critical);
    }

    if (warnings.length > 0) {
      console.log('⚠️  Warnings (fix for better performance):\n');
      this.printIssues(warnings);
    }

    if (info.length > 0) {
      console.log('💡 Suggestions (consider optimizing):\n');
      this.printIssues(info);
    }

    console.log('─'.repeat(80));
    this.printSummary();
  }

  private printIssues(issues: PerformanceIssue[]): void {
    // Group by file
    const byFile = new Map<string, PerformanceIssue[]>();

    issues.forEach(issue => {
      if (!byFile.has(issue.file)) {
        byFile.set(issue.file, []);
      }
      byFile.get(issue.file)!.push(issue);
    });

    byFile.forEach((fileIssues, file) => {
      console.log(`📄 ${file}`);

      fileIssues.forEach(issue => {
        console.log(`  Line ${issue.line}: ${issue.message}`);
        if (issue.fix) {
          console.log(`  💡 Fix: ${issue.fix}`);
        }
      });

      console.log('');
    });
  }

  private printSummary(): void {
    console.log('\n📊 Summary by Issue Type:\n');

    const typeCount = new Map<string, number>();
    this.issues.forEach(issue => {
      typeCount.set(issue.type, (typeCount.get(issue.type) || 0) + 1);
    });

    const sortedTypes = Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedTypes.forEach(([type, count]) => {
      const icon = this.getIconForType(type);
      console.log(`${icon} ${type}: ${count}`);
    });

    console.log('\n🎯 Recommended Actions:\n');
    console.log('1. Fix all critical issues first (inline functions, unvirtualized lists)');
    console.log('2. Profile with React DevTools to confirm impact');
    console.log('3. Add React.memo to components that re-render frequently');
    console.log('4. Run bundle analyzer to identify code splitting opportunities');
    console.log('');
  }

  private getIconForType(type: string): string {
    const icons: Record<string, string> = {
      'inline-function': '🔥',
      'unvirtualized-list': '📋',
      'missing-memo': '🔄',
      'expensive-render': '⏱️',
      'derived-state': '💾'
    };
    return icons[type] || '📌';
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const dir = args[0] || 'src';

  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory not found: ${dir}`);
    console.error('\nUsage: npx tsx performance_audit.ts [directory]');
    console.error('Example: npx tsx performance_audit.ts src/components');
    process.exit(1);
  }

  const auditor = new PerformanceAuditor();
  auditor.auditDirectory(dir);
  auditor.report();
}

export { PerformanceAuditor };
