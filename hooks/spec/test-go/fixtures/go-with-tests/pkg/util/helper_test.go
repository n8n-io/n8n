package util

import "testing"

func TestGreet(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"simple name", "World", "Hello, World!"},
		{"empty name", "", "Hello, !"},
		{"special chars", "Go 1.21", "Hello, Go 1.21!"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Greet(tt.input)
			if got != tt.expected {
				t.Errorf("Greet(%q) = %q; want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestReverse(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"simple string", "hello", "olleh"},
		{"palindrome", "racecar", "racecar"},
		{"empty", "", ""},
		{"unicode", "Hello, 世界", "界世 ,olleH"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Reverse(tt.input)
			if got != tt.expected {
				t.Errorf("Reverse(%q) = %q; want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestContains(t *testing.T) {
	tests := []struct {
		name     string
		s        string
		substr   string
		expected bool
	}{
		{"contains substring", "hello world", "world", true},
		{"does not contain", "hello world", "foo", false},
		{"empty substring", "hello", "", true},
		{"both empty", "", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Contains(tt.s, tt.substr)
			if got != tt.expected {
				t.Errorf("Contains(%q, %q) = %v; want %v", tt.s, tt.substr, got, tt.expected)
			}
		})
	}
}
