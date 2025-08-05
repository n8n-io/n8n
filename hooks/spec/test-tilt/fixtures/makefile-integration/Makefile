.PHONY: test-tilt
test-tilt:
	@echo "Running Tiltfile tests..."
	python -m pytest Tiltfile_test.py -v
	@echo "All Tiltfile tests passed!"

.PHONY: test
test: test-tilt
	@echo "Running all tests..."

.PHONY: lint
lint:
	@echo "Linting code..."
	pylint Tiltfile

.PHONY: fmt
fmt:
	@echo "Formatting code..."
	black Tiltfile Tiltfile_test.py