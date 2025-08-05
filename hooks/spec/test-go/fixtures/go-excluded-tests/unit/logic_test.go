package unit

import "testing"

func TestProcessString(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"simple string", "Hello World", "hello-world"},
		{"with spaces", "  Test String  ", "test-string"},
		{"already lowercase", "already-lowercase", "already-lowercase"},
		{"empty", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ProcessString(tt.input)
			if got != tt.expected {
				t.Errorf("ProcessString(%q) = %q; want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{"valid email", "test@example.com", true},
		{"valid with subdomain", "user@mail.example.com", true},
		{"missing @", "testexample.com", false},
		{"missing domain", "test@", false},
		{"missing local", "@example.com", false},
		{"no dot in domain", "test@example", false},
		{"empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ValidateEmail(tt.email)
			if got != tt.expected {
				t.Errorf("ValidateEmail(%q) = %v; want %v", tt.email, got, tt.expected)
			}
		})
	}
}

func TestCalculateScore(t *testing.T) {
	tests := []struct {
		name       string
		base       int
		multiplier float64
		bonus      int
		expected   int
	}{
		{"simple calculation", 100, 1.5, 10, 160},
		{"no multiplier", 100, 1.0, 20, 120},
		{"no bonus", 50, 2.0, 0, 100},
		{"all zero", 0, 0, 0, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateScore(tt.base, tt.multiplier, tt.bonus)
			if got != tt.expected {
				t.Errorf("CalculateScore(%d, %f, %d) = %d; want %d",
					tt.base, tt.multiplier, tt.bonus, got, tt.expected)
			}
		})
	}
}
