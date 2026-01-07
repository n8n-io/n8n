import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ilxfzatarzsusrhwmjlu.supabase.co';
const supabaseKey =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseGZ6YXRhcnpzdXNyaHdtamx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDYyODQsImV4cCI6MjA3NjgyMjI4NH0.Gseu5rjNTmY8HTDQuqo-C2buCqJ9ZY-d1w7e4cxZ00s';

export const supabase = createClient(supabaseUrl, supabaseKey);
