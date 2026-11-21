# roast (skill)

The skill package for `/roast`. See [SKILL.md](SKILL.md) for the full workflow.

## Layout

```
roast/
├── SKILL.md                          # the panel workflow + tool integration + hard rules
├── scripts/
│   ├── brief_builder.py              # normalize the 4 inputs into one shared brief; flag gaps
│   ├── verdict_synthesizer.py        # weighted call + veto gates + tension → GO/RESHAPE/KILL
│   └── cheapest_test_designer.py     # riskiest assumption → 48-hour test w/ pass/fail signals
├── references/
│   ├── adversarial_panel_canon.md    # why five hostile lenses beat one reviewer (7 sources)
│   ├── verdict_synthesis_method.md   # weighting, veto gates, why not to average (6 sources)
│   └── cheapest_test_canon.md        # demand testing before building (7 sources)
└── assets/
    ├── roast_brief_worksheet.md      # fillable 4-input brief
    └── example_roast_verdict.md      # a full worked roast
```

## Tools (all stdlib, `--help` + `--sample`, no LLM calls)

```bash
python scripts/brief_builder.py --sample
python scripts/verdict_synthesizer.py --sample
python scripts/cheapest_test_designer.py --sample
```

## Design notes

- **The verdict is reproducible, not vibes.** `verdict_synthesizer.py` encodes a non-compensatory
  weighting (demand and survival heaviest, the bull lightest) with veto gates, so a high average can't
  hide a fatal weakness. The Judge writes the prose; the tool fixes the call + confidence.
- **The cheapest test is always falsifiable.** Each test ships an explicit pass/fail signal so "go
  validate it" never substitutes for a real experiment.
