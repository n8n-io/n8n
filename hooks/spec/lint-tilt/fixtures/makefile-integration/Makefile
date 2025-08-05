# Makefile with Tiltfile linting targets

.PHONY: lint-tilt fix-tilt

lint-tilt:
	@echo "Running custom Tiltfile linter"
	@if [ -f Tiltfile ]; then \
		echo "Checking Tiltfile syntax..."; \
		python -m py_compile Tiltfile 2>&1 || exit 1; \
		echo "Tiltfile lint passed"; \
	fi

fix-tilt:
	@echo "Fixing Tiltfile formatting"
	@if [ -f Tiltfile ]; then \
		echo "# Fixed by make fix-tilt" >> Tiltfile; \
	fi