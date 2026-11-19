#!/usr/bin/env node
/**
 * RLS Policy Diagnostic Script
 *
 * Checks if Row Level Security policies are allowing/blocking access correctly.
 * The #1 cause of "empty results but no error" issues in Supabase.
 *
 * Usage:
 *   node check-rls.js                    # Uses env vars
 *   node check-rls.js <url> <anon_key>   # Explicit credentials
 */

const TABLES_TO_CHECK = [
  'profiles',
  'meetings',
  'forum_posts',
  'forum_comments',
  'journal_entries',
  'daily_checkins',
  'saved_meetings',
  'recovery_plans',
  'safety_plans'
];

async function main() {
  // Dynamic import for ESM compatibility
  const { createClient } = await import('@supabase/supabase-js');

  const url = process.argv[2] || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.argv[3] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Usage: node check-rls.js <SUPABASE_URL> <ANON_KEY>');
    console.error('Or set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log('╔════════════════════════════════════════════╗');
  console.log('║         RLS POLICY DIAGNOSTIC              ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log(`URL: ${url.substring(0, 40)}...`);
  console.log(`Testing as: anonymous (anon key)\n`);

  const results = {
    accessible: [],
    blocked: [],
    errors: []
  };

  for (const table of TABLES_TO_CHECK) {
    process.stdout.write(`Checking ${table.padEnd(20)}`);

    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        if (error.code === 'PGRST204') {
          // Table doesn't exist
          console.log(`⚠️  TABLE NOT FOUND`);
        } else if (error.code === '42501') {
          // Permission denied
          console.log(`🔒 BLOCKED BY RLS`);
          results.blocked.push({ table, error: error.message });
        } else {
          console.log(`❌ ERROR: ${error.message}`);
          results.errors.push({ table, error: error.message });
        }
      } else if (count === 0) {
        console.log(`✅ OK (0 rows - empty or filtered)`);
        results.accessible.push({ table, count: 0 });
      } else {
        console.log(`✅ OK (${count} rows accessible)`);
        results.accessible.push({ table, count });
      }
    } catch (err) {
      console.log(`❌ EXCEPTION: ${err.message}`);
      results.errors.push({ table, error: err.message });
    }
  }

  // Summary
  console.log('\n════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('════════════════════════════════════════════');
  console.log(`✅ Accessible: ${results.accessible.length} tables`);
  console.log(`🔒 Blocked:    ${results.blocked.length} tables`);
  console.log(`❌ Errors:     ${results.errors.length} tables`);

  if (results.blocked.length > 0) {
    console.log('\n🔒 BLOCKED TABLES (need RLS policy review):');
    results.blocked.forEach(({ table, error }) => {
      console.log(`   - ${table}: ${error}`);
    });
    console.log('\nTo fix, add a SELECT policy in Supabase:');
    console.log('   CREATE POLICY "Allow public read" ON table_name');
    console.log('   FOR SELECT USING (true);');
  }

  if (results.errors.length > 0) {
    console.log('\n❌ TABLES WITH ERRORS:');
    results.errors.forEach(({ table, error }) => {
      console.log(`   - ${table}: ${error}`);
    });
  }

  // Exit with error if any issues
  if (results.blocked.length > 0 || results.errors.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
