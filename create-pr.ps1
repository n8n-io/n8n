# Create PR Script for Issue #19319
Write-Host "Creating PR for Issue #19319..."

# Check git status
Write-Host "Checking git status..."
git status

# Add all changes
Write-Host "Adding changes..."
git add packages/nodes-base/nodes/Webhook/Webhook.node.ts
git add packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts
git add packages/nodes-base/__tests__/httprequest-json-validation.test.js
git add packages/nodes-base/__tests__/webhook-json-parsing.test.js
git add repro-summary.txt
git add PR_BODY.md
git add dev/.gitignore

# Check status again
Write-Host "Status after adding files..."
git status

# Commit changes
Write-Host "Committing changes..."
git commit -m "fix(webhook/http-request): defensive JSON parsing + clearer NodeOperationError messaging (#19319)

- Parse JSON strings at webhook ingress for JSON content-types and return 400 on parse failure.
- Add enhanced error messages in HttpRequest V3 with parse details and JSON.stringify guidance.
- Add unit/integration tests for parsing + edge cases."

# Check if commit was successful
Write-Host "Checking commit..."
git log --oneline -1

Write-Host "PR creation script completed!"
Write-Host "Next steps:"
Write-Host "1. Push branch: git push origin fix/19319-webhook-httprequest-json"
Write-Host "2. Create PR: gh pr create --base n8n-io:main --head YOUR_USERNAME:fix/19319-webhook-httprequest-json --title 'fix(webhook/http-request): defensive JSON parsing + contextual error messages (fixes #19319)' --body-file ./PR_BODY.md"
