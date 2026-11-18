## Overview

New orders are pulled every hour by [Sync orders to CRM](/workflow/Vq9IdbMC7ITCRnFR) and stored in [Orders](/projects/dkjNUq6msDo1qe7b/datatables/UYQPjn1J6ddOJtHj).

## How it works

1. [Every hour](/workflow/Vq9IdbMC7ITCRnFR/11111111-1111-4111-8111-111111111111) starts the run.
2. [Fetch new orders](/workflow/Vq9IdbMC7ITCRnFR/22222222-2222-4222-8222-222222222222) calls the shop API with [Orders API key](/projects/dkjNUq6msDo1qe7b/credentials/WGs1zeDEifTjZuvN).
3. [Map to CRM fields](/workflow/Vq9IdbMC7ITCRnFR/33333333-3333-4333-8333-333333333333) renames the fields for the CRM.

## When it fails

- Rotate the API key first. It expires every 90 days.
- Refunds are handled by [Refund approval API](/workflow/CQaZgvB4DPVWIH5x).
- Numbers look wrong? Check [Daily sales report](/page/TyUl05NOB2u0r5Ad).
