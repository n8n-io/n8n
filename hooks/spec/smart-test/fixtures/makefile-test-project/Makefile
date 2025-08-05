# Test Makefile with test target

.PHONY: test build

test:
	@echo "Running project tests with FILE=$(FILE)"
	@if [ -n "$(FILE)" ]; then \
		echo "Testing specific file: $(FILE)"; \
	else \
		echo "Running all tests"; \
	fi
	@exit 0

build:
	@echo "Building project"
	@exit 0