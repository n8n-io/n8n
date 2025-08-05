# Test Makefile with lint target

.PHONY: lint test build

lint:
	@echo "Running project lint with FILE=$(FILE)"
	@if [ -n "$(FILE)" ]; then \
		echo "Linting specific file: $(FILE)"; \
	else \
		echo "Linting all files"; \
	fi
	@exit 0

test:
	@echo "Running project tests with FILE=$(FILE)"
	@exit 0

build:
	@echo "Building project"
	@exit 0