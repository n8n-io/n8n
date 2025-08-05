# nested-tiltfiles

This fixture demonstrates a complex project structure with nested Tiltfiles.

## Structure
```
.
├── Tiltfile                    # Root orchestrator
├── Tiltfile_test.py           # Root tests
├── frontend/
│   ├── Tiltfile               # Frontend config
│   └── test_frontend_tiltfile.py
├── backend/
│   ├── Tiltfile               # Backend config
│   └── Tiltfile_test.py
└── services/
    └── auth/
        └── Tiltfile           # Auth service config (no tests)
```

## Key Features
- Root Tiltfile loads nested Tiltfiles using `load()`
- Each subdirectory can have its own Tiltfile
- Some nested Tiltfiles have tests, others don't
- Different test naming patterns across subdirectories

## Expected Behavior
The test-tilt hook should:
1. Find all Tiltfiles in the directory tree
2. Run tests for Tiltfiles that have associated test files
3. Skip Tiltfiles without tests (like services/auth/Tiltfile)
4. Handle the nested structure correctly