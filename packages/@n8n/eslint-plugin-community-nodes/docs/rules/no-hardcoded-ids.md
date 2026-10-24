# Disallow fixed partner and other account identifiers in community node source (`@n8n/community-nodes/no-hardcoded-ids`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Community nodes must let users set partner and account identifiers. This rule
checks string literals assigned to `partnerId`, `partner_id`, and similar names
in `.node.ts` and `.node.js` files. It also checks affiliate, reseller, account,
tenant, customer, and client IDs. The rule applies to community node packages
that use a recommended config.

Read these values from a node parameter or credential instead. The rule does not
change a hardcoded value automatically.

## Examples

### Incorrect

```typescript
const options = { qs: { partner_id: 'fixed-partner' } };
```

### Correct

```typescript
const options = { qs: { partner_id: this.getNodeParameter('partnerId', itemIndex) } };
```
